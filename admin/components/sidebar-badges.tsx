import { fetchPendingActorCount, fetchUnreadAdminAlertCount } from "@/lib/queries";

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export async function PendingActorsBadge() {
  return <CountBadge count={await fetchPendingActorCount()} />;
}

export async function UnreadAlertsBadge() {
  return <CountBadge count={await fetchUnreadAdminAlertCount()} />;
}
