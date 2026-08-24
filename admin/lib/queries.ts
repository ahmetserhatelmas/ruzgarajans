import { createClient } from "@/lib/supabase/server";
import { ageFromBirth } from "@/lib/labels";
import type {
  ActorProfile,
  ActorRow,
  Announcement,
  Application,
  CastListing,
  Conversation,
  GalleryPhoto,
  Message,
  Profile,
  Video,
} from "@/lib/types";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile: profile as Profile | null };
}

export async function fetchActorRows(): Promise<ActorRow[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: actors }, { data: photos }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "actor")
      .order("created_at", { ascending: false }),
    supabase.from("actor_profiles").select("*"),
    supabase.from("gallery_photos").select("user_id, kind"),
  ]);

  const actorMap = new Map(
    ((actors ?? []) as ActorProfile[]).map((a) => [a.user_id, a])
  );
  const photoMap = new Map<string, string[]>();
  for (const p of (photos ?? []) as { user_id: string; kind: string | null }[]) {
    if (!p.kind) continue;
    const list = photoMap.get(p.user_id) ?? [];
    list.push(p.kind);
    photoMap.set(p.user_id, list);
  }

  return ((profiles ?? []) as Profile[]).map((profile) => ({
    profile,
    actor: actorMap.get(profile.id) ?? null,
    photoKinds: photoMap.get(profile.id) ?? [],
  }));
}

export async function fetchActorDetail(id: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: actor }, { data: photos }, { data: apps }, { data: videos }] =
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
  };
}

export async function fetchCasts() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cast_listings")
    .select("*, applications(id, status)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as (CastListing & {
    applications: { id: string; status: string }[];
  })[];
}

export async function fetchCastDetail(id: string) {
  const supabase = await createClient();
  const [{ data: cast }, { data: apps }, { data: videos }] = await Promise.all([
    supabase.from("cast_listings").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("applications")
      .select("*, profiles:actor_id(id, full_name, email, avatar_url, actor_status)")
      .eq("cast_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("videos").select("*").eq("cast_id", id).eq("kind", "audition"),
  ]);
  return {
    cast: cast as CastListing | null,
    applications: (apps ?? []) as (Application & {
      profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url" | "actor_status"> | null;
    })[],
    videos: (videos ?? []) as Video[],
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
