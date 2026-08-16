import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: profile }, { count }] = await Promise.all([
    user
      ? supabase.from("profiles").select("email").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "actor")
      .eq("actor_status", "pending"),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar email={profile?.email ?? user?.email} pendingCount={count ?? 0} />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
