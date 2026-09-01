import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { count }] = await Promise.all([
    user
      ? supabase
          .from("profiles")
          .select("email, role, is_super_admin, admin_permissions")
          .eq("id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "actor")
      .eq("actor_status", "pending"),
  ]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar
        email={profile?.email ?? user?.email}
        pendingCount={count ?? 0}
        profile={profile as { role: "actor" | "admin" | "cast_director"; is_super_admin?: boolean; admin_permissions?: string[] } | null}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-10 md:p-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
