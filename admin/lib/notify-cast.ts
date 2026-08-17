import { ageFromBirth } from "@/lib/labels";
import { fetchActorRows } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ActorRow, CastListing } from "@/lib/types";

type NotifyCast = Pick<
  CastListing,
  | "id"
  | "project_name"
  | "role_name"
  | "is_published"
  | "gender"
  | "age_min"
  | "age_max"
  | "nationalities"
  | "languages"
>;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export function hasNotificationCriteria(cast: Pick<
  CastListing,
  "gender" | "age_min" | "age_max" | "nationalities" | "languages"
>) {
  return (
    (cast.gender && cast.gender !== "any") ||
    cast.age_min != null ||
    cast.age_max != null ||
    (cast.nationalities?.length ?? 0) > 0 ||
    (cast.languages?.length ?? 0) > 0
  );
}

export function matchesNotificationCriteria(row: ActorRow, cast: NotifyCast) {
  if (cast.gender && cast.gender !== "any") {
    if (row.actor?.gender !== cast.gender) return false;
  }

  if (cast.age_min != null || cast.age_max != null) {
    const age = ageFromBirth(row.actor?.birth_date);
    if (age == null) return false;
    if (cast.age_min != null && age < cast.age_min) return false;
    if (cast.age_max != null && age > cast.age_max) return false;
  }

  if (cast.nationalities?.length) {
    const nationality = row.actor?.nationality?.toUpperCase();
    const allowed = new Set(cast.nationalities.map((code) => code.toUpperCase()));
    if (!nationality || !allowed.has(nationality)) return false;
  }

  if (cast.languages?.length) {
    const spoken = new Set(
      (row.actor?.languages ?? []).map((item) => {
        const sep = item.lastIndexOf(":");
        return (sep > 0 ? item.slice(0, sep) : item).trim().toLowerCase();
      })
    );
    if (!cast.languages.every((code) => spoken.has(code.toLowerCase()))) return false;
  }

  return true;
}

function copyFor(locale: string, cast: NotifyCast) {
  const tr = locale.startsWith("tr");
  return {
    title: tr ? "Size uygun bir rol var" : "A role that fits you",
    body: `${cast.project_name} · ${cast.role_name}`,
  };
}

async function sendExpoPush(
  messages: {
    to: string;
    title: string;
    body: string;
    data: Record<string, string>;
  }[]
) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });
  }
}

export async function notifyMatchingActors(cast: NotifyCast) {
  if (!cast.is_published || !hasNotificationCriteria(cast)) return;

  const rows = await fetchActorRows();
  const targets = rows.filter(
    (row) =>
      row.profile.role === "actor" &&
      row.profile.actor_status === "approved" &&
      matchesNotificationCriteria(row, cast)
  );
  if (!targets.length) return;

  const supabase = await createClient();
  const rowsToInsert = targets.map((row) => {
    const copy = copyFor(row.profile.locale, cast);
    return {
      user_id: row.profile.id,
      type: "new_cast" as const,
      title: copy.title,
      body: copy.body,
      data: { castId: cast.id, url: `/(actor)/cast/${cast.id}` },
    };
  });

  const { error } = await supabase.from("notifications").insert(rowsToInsert);
  if (error) console.error("cast notify insert failed", error.message);

  const messages = targets
    .filter((row) => row.profile.expo_push_token)
    .map((row) => {
      const copy = copyFor(row.profile.locale, cast);
      return {
        to: row.profile.expo_push_token as string,
        sound: "default",
        title: copy.title,
        body: copy.body,
        data: { castId: cast.id, url: `/(actor)/cast/${cast.id}` },
      };
    });

  if (messages.length) {
    await sendExpoPush(messages);
  }
}
