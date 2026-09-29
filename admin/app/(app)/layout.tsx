import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { PendingActorsBadge, UnreadAlertsBadge } from "@/components/sidebar-badges";
import { getAdminProfile } from "@/lib/permissions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getAdminProfile();
  if (!user || profile?.role !== "admin") redirect("/login?error=admin");

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar
        email={profile?.email ?? user?.email}
        profile={profile}
        pendingBadge={
          <Suspense fallback={null}>
            <PendingActorsBadge />
          </Suspense>
        }
        alertBadge={
          <Suspense fallback={null}>
            <UnreadAlertsBadge />
          </Suspense>
        }
      />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-10 md:p-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
