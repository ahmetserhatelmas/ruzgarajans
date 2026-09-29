import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { canAdmin, isSuperAdmin, type AdminPerm } from "@/lib/admin-perms";

export { ADMIN_PERMS, ADMIN_PERM_GROUPS, ADMIN_PERM_LABELS, canAdmin, isSuperAdmin } from "@/lib/admin-perms";
export type { AdminPerm } from "@/lib/admin-perms";

export const getAdminProfile = cache(async () => {
  const supabase = await createClient();

  // Prefer local JWT verification; fall back to getUser for older symmetric keys.
  const { data: claimsData } = await supabase.auth.getClaims();
  let userId = claimsData?.claims?.sub as string | undefined;
  let claimEmail =
    typeof claimsData?.claims?.email === "string" ? claimsData.claims.email : null;
  let user: User | null = null;

  if (!userId) {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
    userId = authUser?.id;
    claimEmail = authUser?.email ?? null;
  }

  if (!userId) return { supabase, user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_super_admin, admin_permissions")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    user = {
      id: userId,
      email: (profile as Profile | null)?.email ?? claimEmail ?? undefined,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "",
    } as User;
  }

  return { supabase, user, profile: (profile as Profile | null) ?? null };
});

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
