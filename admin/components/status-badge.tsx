import { Badge } from "@/components/ui/badge";
import { ACTOR_STATUS, APP_STATUS } from "@/lib/labels";
import type { ActorStatus, ApplicationStatus } from "@/lib/types";

export function ActorStatusBadge({
  status,
  steps,
}: {
  status: ActorStatus;
  steps?: number;
}) {
  if (status === "approved") {
    return <Badge variant="default">{ACTOR_STATUS.approved}</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive">{ACTOR_STATUS.rejected}</Badge>;
  }
  const progress = `${Math.max(0, Math.min(2, steps ?? 0))}/2`;
  return <Badge variant="outline">{progress}</Badge>;
}

export function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant="outline">{APP_STATUS[status]}</Badge>;
}
