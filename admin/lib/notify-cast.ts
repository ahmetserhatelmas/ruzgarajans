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
const BRAND_LOGO_URL = "https://ruzgarajans.vercel.app/brand-logo.png";

function isTurkish(locale?: string | null) {
  const raw = (locale ?? "tr").trim().toLowerCase();
  return !raw.startsWith("en");
}

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

function copyFor(locale: string | null | undefined, cast: NotifyCast) {
  const tr = isTurkish(locale);
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
    sound?: string;
    channelId?: string;
    priority?: "default" | "normal" | "high";
    subtitle?: string;
    mutableContent?: boolean;
    richContent?: { image: string };
  }[]
) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const text = await res.text();
      if (!res.ok) {
        console.error("expo push failed", res.status, text);
      }
    } catch (err) {
      console.error("expo push failed", err);
    }
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
        channelId: "casts",
        priority: "high" as const,
        subtitle: "Rüzgar Oyunculuk",
        mutableContent: true,
        richContent: { image: BRAND_LOGO_URL },
      };
    });

  if (messages.length) {
    await sendExpoPush(messages);
  }
}

export async function notifyOptionedActor(
  cast: Pick<CastListing, "id" | "project_name" | "role_name">,
  actorId: string
) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale, expo_push_token")
    .eq("id", actorId)
    .maybeSingle();
  if (!profile) return;

  const tr = isTurkish(profile.locale);
  const title = tr
    ? "Sizi bu projeye opsiyonlamak istiyoruz"
    : "We want to option you for this project";
  const body = tr
    ? `${cast.project_name} · ${cast.role_name}. Uygun görüyor musunuz?`
    : `${cast.project_name} · ${cast.role_name}. Are you available?`;
  const data = { castId: cast.id, url: `/(actor)/cast/${cast.id}` };

  const { error } = await supabase.from("notifications").insert({
    user_id: profile.id,
    type: "new_cast",
    title,
    body,
    data,
  });
  if (error) console.error("option notify insert failed", error.message);

  if (profile.expo_push_token) {
    await sendExpoPush([
      {
        to: profile.expo_push_token,
        title,
        body,
        data,
        sound: "default",
        channelId: "options",
        priority: "high" as const,
        subtitle: "Rüzgar Oyunculuk",
        mutableContent: true,
        richContent: { image: BRAND_LOGO_URL },
      },
    ]);
  }
}
