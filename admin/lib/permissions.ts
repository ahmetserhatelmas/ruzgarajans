import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { canAdmin, isSuperAdmin, type AdminPerm } from "@/lib/admin-perms";

export { ADMIN_PERMS, ADMIN_PERM_GROUPS, ADMIN_PERM_LABELS, canAdmin, isSuperAdmin } from "@/lib/admin-perms";
export type { AdminPerm } from "@/lib/admin-perms";

export async function getAdminProfile() {
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

  return { supabase, user, profile: (profile as Profile | null) ?? null };
}

export async function requireAdminPerm(perm?: AdminPerm | "admins") {
  const session = await getAdminProfile();
  if (!session.user || session.profile?.role !== "admin") redirect("/login");
  if (perm === "admins") {
    if (!isSuperAdmin(session.profile)) redirect("/?error=forbidden");
    return session;
  }
  if (perm && !canAdmin(session.profile, perm)) redirect("/?error=forbidden");
  return session;
}
