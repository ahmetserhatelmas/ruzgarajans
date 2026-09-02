import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { getAdminProfile } from "@/lib/permissions";
import { fetchPendingActorCount } from "@/lib/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getAdminProfile();
  if (!user || profile?.role !== "admin") redirect("/login?error=admin");
  const pendingCount = await fetchPendingActorCount();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        email={profile?.email ?? user?.email}
        pendingCount={pendingCount}
        profile={profile}
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-10 md:p-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
