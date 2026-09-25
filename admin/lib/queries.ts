import { cache } from "react";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirth } from "@/lib/labels";
import type {
  AdminAlert,
  ActorProfile,
  ActorRow,
  Announcement,
  AppSettings,
  Application,
  CastIntroduction,
  CastOption,
  CastListing,
  Conversation,
  GalleryPhoto,
  Message,
  Profile,
  Video,
} from "@/lib/types";

export { getAdminProfile as requireAdmin } from "@/lib/permissions";

export const fetchPendingActorCount = cache(async () => {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "actor")
    .eq("actor_status", "pending");
  const ids = (pending ?? []).map((row) => row.id);
  if (!ids.length) return 0;
  const { count } = await supabase
    .from("actor_profiles")
    .select("user_id", { count: "exact", head: true })
    .in("user_id", ids)
    .not("registration_completed_at", "is", null);
  return count ?? 0;
});

const ACTOR_ROW_SELECT =
  "user_id, gender, national_id, city, birth_date, height_cm, weight_kg, body_size, tshirt_size, pants_size, suit_size, shoe_size, hair_color, eye_color, sports, dances, nationality, languages, address, whatsapp, instagram, facebook, experience, form_saved_at, media_saved_at, registration_completed_at, intro_video_playback_url, mimic_video_playback_url";

const ACTOR_ROW_SELECT_NO_FACEBOOK = ACTOR_ROW_SELECT.replace(" instagram, facebook,", " instagram,");

export async function fetchActorRows(): Promise<ActorRow[]> {
  const supabase = await createClient();
  const [{ data: profiles }, actorsRes, { data: photos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, phone, actor_status, avatar_url, cover_url, created_at")
      .eq("role", "actor")
      .order("created_at", { ascending: false }),
    supabase.from("actor_profiles").select(ACTOR_ROW_SELECT),
    supabase.from("gallery_photos").select("user_id, kind, public_url"),
  ]);
  const actors = actorsRes.error
    ? (await supabase.from("actor_profiles").select(ACTOR_ROW_SELECT_NO_FACEBOOK)).data
    : actorsRes.data;

  const actorMap = new Map(
    ((actors ?? []) as ActorProfile[]).map((a) => [a.user_id, a])
  );
  const photoMap = new Map<string, string[]>();
  const chestMap = new Map<string, string>();
  for (const p of (photos ?? []) as {
    user_id: string;
    kind: string | null;
    public_url: string | null;
  }[]) {
    if (!p.kind) continue;
    const list = photoMap.get(p.user_id) ?? [];
    list.push(p.kind);
    photoMap.set(p.user_id, list);
    if (p.kind === "chest" && p.public_url) chestMap.set(p.user_id, p.public_url);
  }

  return ((profiles ?? []) as Profile[]).map((profile) => ({
    profile,
    actor: actorMap.get(profile.id) ?? null,
    photoKinds: photoMap.get(profile.id) ?? [],
    chestPhotoUrl: chestMap.get(profile.id) ?? null,
  }));
}

export async function fetchActorDetail(id: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: actor }, { data: photos }, { data: apps }, { data: videos }, { data: intros }, { data: optionRows }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase.from("actor_profiles").select("*").eq("user_id", id).maybeSingle(),
      supabase
        .from("gallery_photos")
        .select("id, user_id, public_url, kind, sort_order")
        .eq("user_id", id)
        .order("sort_order"),
      supabase
        .from("applications")
        .select(
          "*, cast_listings(id, project_name, role_name, shoot_date, option_date, budget_amount, budget_currency)"
        )
        .eq("actor_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("videos")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("cast_introductions")
        .select("*, cast_listings(id, project_name, role_name)")
        .eq("actor_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("cast_options")
        .select("*, cast_listings(id, project_name, role_name)")
        .eq("actor_id", id)
        .order("created_at", { ascending: false }),
    ]);

  return {
    profile: profile as Profile | null,
    actor: actor as ActorProfile | null,
    photos: (photos ?? []) as GalleryPhoto[],
    applications: (apps ?? []) as (Application & {
      cast_listings: Pick<
        CastListing,
        | "id"
        | "project_name"
        | "role_name"
        | "shoot_date"
        | "option_date"
        | "budget_amount"
        | "budget_currency"
      > | null;
    })[],
    videos: (videos ?? []) as Video[],
    introductions: (intros ?? []) as (CastIntroduction & {
      cast_listings: Pick<CastListing, "id" | "project_name" | "role_name"> | null;
    })[],
    options: (optionRows ?? []) as (CastOption & {
      cast_listings: Pick<CastListing, "id" | "project_name" | "role_name"> | null;
    })[],
  };
}

export async function fetchCasts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cast_listings")
    .select(
      "id, project_name, role_name, shoot_location, age_min, age_max, gender, deadline, option_date, payment_due_date, budget_amount, budget_currency, is_published, cover_image_url, created_at, applications(count)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as (CastListing & { applications?: { count?: number }[] })[]).map((row) => {
    const count = Number(row.applications?.[0]?.count ?? 0);
    return { ...row, applications: [], application_count: count };
  });
}

export async function fetchDashboardStats() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: actors }, { data: kinds }, { data: casts }, { data: apps }] =
    await Promise.all([
      supabase.from("profiles").select("id, actor_status, avatar_url, cover_url").eq("role", "actor"),
      supabase
        .from("actor_profiles")
        .select("user_id, form_saved_at, media_saved_at, registration_completed_at, intro_video_playback_url, mimic_video_playback_url"),
      supabase.from("gallery_photos").select("user_id, kind"),
      supabase.from("cast_listings").select("id, is_published"),
      supabase.from("applications").select("id, status"),
    ]);
  return {
    profiles: (profiles ?? []) as Pick<Profile, "id" | "actor_status" | "avatar_url" | "cover_url">[],
    actors: (actors ?? []) as Pick<
      ActorProfile,
      | "user_id"
      | "form_saved_at"
      | "media_saved_at"
      | "registration_completed_at"
      | "intro_video_playback_url"
      | "mimic_video_playback_url"
    >[],
    kinds: (kinds ?? []) as { user_id: string; kind: string | null }[],
    casts: (casts ?? []) as Pick<CastListing, "id" | "is_published">[],
    applications: (apps ?? []) as Pick<Application, "id" | "status">[],
  };
}

export async function fetchCastDetail(id: string) {
  const supabase = await createClient();
  const [{ data: cast }, { data: apps }, { data: videos }, { data: intros }, { data: optionRows }] =
    await Promise.all([
    supabase.from("cast_listings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("applications")
      .select("*, profiles:actor_id(id, full_name, email, avatar_url, actor_status)")
      .eq("cast_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("videos").select("*").eq("cast_id", id).eq("kind", "audition"),
    supabase
      .from("cast_introductions")
      .select("*, profiles:actor_id(id, full_name, email, actor_status)")
      .eq("cast_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cast_options")
      .select("*, profiles:actor_id(id, full_name, email, actor_status)")
      .eq("cast_id", id)
      .order("created_at", { ascending: false }),
  ]);
  return {
    cast: cast as CastListing | null,
    applications: (apps ?? []) as (Application & {
      profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "actor_status"> | null;
    })[],
    videos: (videos ?? []) as Video[],
    introductions: (intros ?? []) as (CastIntroduction & {
      profiles: Pick<Profile, "id" | "full_name" | "email" | "actor_status"> | null;
    })[],
    options: (optionRows ?? []) as (CastOption & {
      profiles: Pick<Profile, "id" | "full_name" | "email" | "actor_status"> | null;
    })[],
  };
}

export async function fetchApplications() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "*, profiles:actor_id(id, full_name, email, avatar_url, actor_status), cast_listings(id, project_name, role_name, deadline, option_date, payment_due_date, budget_amount, budget_currency)"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Application & {
    profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "actor_status"> | null;
    cast_listings: Pick<
      CastListing,
      "id" | "project_name" | "role_name" | "deadline" | "budget_amount" | "budget_currency"
    > | null;
  })[];
}

export async function fetchApplicationDetail(id: string) {
  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select(
      "*, cast_listings(id, project_name, role_name, role_description, deadline, option_date, payment_due_date, budget_amount, budget_currency)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!app) return { app: null, actor: null, videos: [] as Video[] };

  const actor = await fetchActorDetail(app.actor_id);
  const [{ data: byApp }, { data: byCast }] = await Promise.all([
    supabase
      .from("videos")
      .select("*")
      .eq("application_id", id)
      .eq("kind", "audition"),
    supabase
      .from("videos")
      .select("*")
      .eq("cast_id", app.cast_id)
      .eq("user_id", app.actor_id)
      .eq("kind", "audition"),
  ]);
  const videos = [...((byApp ?? []) as Video[]), ...((byCast ?? []) as Video[])].filter(
    (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
  );

  return { app, actor, videos };
}

export async function fetchConversations() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, profiles:actor_id(full_name, email, avatar_url)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (Conversation & {
    profiles: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
  })[];
}

export async function fetchMessages(conversationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function fetchAnnouncements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

export function matchesCast(row: ActorRow, cast: CastListing) {
  const age = ageFromBirth(row.actor?.birth_date);
  if (cast.age_min != null && (age == null || age < cast.age_min)) return false;
  if (cast.age_max != null && (age == null || age > cast.age_max)) return false;
  if (cast.gender !== "any" && row.actor?.gender && row.actor.gender !== cast.gender) {
    return false;
  }
  const h = row.actor?.height_cm;
  if (cast.height_min_cm != null && (h == null || h < cast.height_min_cm)) return false;
  if (cast.height_max_cm != null && (h == null || h > cast.height_max_cm)) return false;
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

export const fetchUnreadAdminAlertCount = cache(async () => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("admin_alerts")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
});

export async function fetchAdminAlerts(limit = 50): Promise<AdminAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("admin_alerts")
    .select("id, type, title, body, application_id, actor_id, cast_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as AdminAlert[];
}

export async function markAdminAlertsForApplication(applicationId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_alerts")
    .update({ read_at: new Date().toISOString() })
    .eq("application_id", applicationId)
    .is("read_at", null);
  if (!error) {
    revalidatePath("/alerts");
    revalidatePath("/");
  }
}

const DEFAULT_MIMIC_TR = [
  "Kameraya bakabilir misiniz?",
  "Gülümseyebilir misiniz?",
  "Şaşırmış gibi yapabilir misiniz?",
  "Kızgın bir ifade verebilir misiniz?",
  "Üzgün bir ifade verebilir misiniz?",
  "Tekrar gülümseyebilir misiniz?",
];

const DEFAULT_MIMIC_EN = [
  "Could you look at the camera?",
  "Could you smile?",
  "Could you look surprised?",
  "Could you show an angry face?",
  "Could you show a sad face?",
  "Could you smile again?",
];

export async function fetchAppSettings(): Promise<AppSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select("id, mimic_cues_tr, mimic_cues_en, mimic_speech_rate, mimic_pause_ms")
    .eq("id", 1)
    .maybeSingle();
  if (error) return null;
  return (data as AppSettings | null) ?? null;
}

/** Push default cues + 1.00 speed if the live row is still the old slow default. */
export async function activateMimicDefaults(): Promise<AppSettings | null> {
  const current = await fetchAppSettings();
  const rate = Number(current?.mimic_speech_rate);
  const cuesTr = (current?.mimic_cues_tr ?? []).map((s) => String(s).trim()).filter(Boolean);
  const needsRate = !current || !Number.isFinite(rate) || Math.abs(rate - 0.4) < 0.001;
  const needsCues = !cuesTr.length;
  if (!needsRate && !needsCues) return current;

  const supabase = await createClient();
  const payload = {
    mimic_cues_tr: needsCues ? DEFAULT_MIMIC_TR : cuesTr,
    mimic_cues_en: (current?.mimic_cues_en ?? []).filter(Boolean).length
      ? current!.mimic_cues_en
      : DEFAULT_MIMIC_EN,
    mimic_speech_rate: needsRate ? 1 : rate,
    mimic_pause_ms: current?.mimic_pause_ms ?? 1500,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("app_settings")
    .update(payload)
    .eq("id", 1)
    .select("id, mimic_cues_tr, mimic_cues_en, mimic_speech_rate, mimic_pause_ms")
    .maybeSingle();
  if (!error && data) return data as AppSettings;
  const inserted = await supabase
    .from("app_settings")
    .insert({ id: 1, ...payload })
    .select("id, mimic_cues_tr, mimic_cues_en, mimic_speech_rate, mimic_pause_ms")
    .maybeSingle();
  if (inserted.error) return current;
  return (inserted.data as AppSettings | null) ?? current;
}
