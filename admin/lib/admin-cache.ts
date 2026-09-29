import { unstable_cache, revalidateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";
import { APP_STATUS } from "@/lib/labels";

export const ADMIN_CACHE_TAGS = {
  dashboard: "admin-dashboard",
  actors: "admin-actors",
  casts: "admin-casts",
  applications: "admin-applications",
  messages: "admin-messages",
  announcements: "admin-announcements",
  alerts: "admin-alerts",
} as const;

export function bustAdminCache(...tags: (keyof typeof ADMIN_CACHE_TAGS | string)[]) {
  for (const tag of tags) {
    const value = ADMIN_CACHE_TAGS[tag as keyof typeof ADMIN_CACHE_TAGS] ?? String(tag);
    revalidateTag(value, "max");
  }
}

async function dbClient() {
  const service = createServiceClient();
  if (service) return { supabase: service, cacheable: true as const };
  return { supabase: await createClient(), cacheable: false as const };
}

export type DashboardStatsResult = {
  actors: number;
  approved: number;
  rejected: number;
  pending: number;
  no_form: number;
  no_media: number;
  published_casts: number;
  applications: number;
  app_by_status: Partial<Record<ApplicationStatus, number>>;
};

async function dashboardStatsFromRpc(
  supabase: SupabaseClient,
): Promise<DashboardStatsResult | null> {
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const byStatusRaw =
    row.app_by_status && typeof row.app_by_status === "object"
      ? (row.app_by_status as Record<string, number>)
      : {};
  return {
    actors: Number(row.actors ?? 0),
    approved: Number(row.approved ?? 0),
    rejected: Number(row.rejected ?? 0),
    pending: Number(row.pending ?? 0),
    no_form: Number(row.no_form ?? 0),
    no_media: Number(row.no_media ?? 0),
    published_casts: Number(row.published_casts ?? 0),
    applications: Number(row.applications ?? 0),
    app_by_status: byStatusRaw as Partial<Record<ApplicationStatus, number>>,
  };
}

async function dashboardStatsFallback(supabase: SupabaseClient): Promise<DashboardStatsResult> {
  const statusKeys = Object.keys(APP_STATUS) as ApplicationStatus[];
  const [
    actors,
    approved,
    rejected,
    pending,
    published,
    applications,
    ...statusCounts
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "actor"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "actor")
      .eq("actor_status", "approved"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "actor")
      .eq("actor_status", "rejected"),
    supabase
      .from("actor_profiles")
      .select("user_id, profiles!inner(role, actor_status)", { count: "exact", head: true })
      .eq("profiles.role", "actor")
      .eq("profiles.actor_status", "pending")
      .not("registration_completed_at", "is", null),
    supabase
      .from("cast_listings")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase.from("applications").select("id", { count: "exact", head: true }),
    ...statusKeys.map((status) =>
      supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  ]);

  const app_by_status: Partial<Record<ApplicationStatus, number>> = {};
  statusKeys.forEach((status, i) => {
    app_by_status[status] = statusCounts[i]?.count ?? 0;
  });

  return {
    actors: actors.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    pending: pending.count ?? 0,
    // Without the SQL function, skip expensive media/form scans — show 0 until migration runs.
    no_form: 0,
    no_media: 0,
    published_casts: published.count ?? 0,
    applications: applications.count ?? 0,
    app_by_status,
  };
}

export async function getCachedDashboardStats(): Promise<DashboardStatsResult> {
  const load = async () => {
    const { supabase } = await dbClient();
    const fromRpc = await dashboardStatsFromRpc(supabase);
    if (fromRpc) return fromRpc;
    return dashboardStatsFallback(supabase);
  };
  if (!createServiceClient()) return load();
  return unstable_cache(load, ["admin-dashboard-stats-v2"], {
    revalidate: 60,
    tags: [ADMIN_CACHE_TAGS.dashboard],
  })();
}
