import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { PendingActorsBadge, UnreadAlertsBadge } from "@/components/sidebar-badges";
import { getAdminProfile } from "@/lib/permissions";

function SidebarShell({ children }: { children?: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-sidebar-border bg-sidebar/95 px-3 py-3 backdrop-blur md:hidden print:hidden">
        <div className="size-10 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />
        <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
      </header>
      <aside className="fixed inset-y-0 left-0 z-50 hidden h-dvh w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar print:hidden md:flex">
        <div className="space-y-3 px-5 py-6">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-muted" />
          <div className="h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex flex-1 flex-col gap-2 px-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </aside>
      <div className="hidden shrink-0 print:hidden md:block md:w-64" aria-hidden />
      {children}
    </>
  );
}

async function AppSidebar() {
  const { user, profile } = await getAdminProfile();
  if (!user || profile?.role !== "admin") redirect("/login?error=admin");

  return (
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
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Suspense fallback={<SidebarShell />}>
        <AppSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-10 md:p-8 print:p-0">
        {children}
      </main>
    </div>
  );
}
