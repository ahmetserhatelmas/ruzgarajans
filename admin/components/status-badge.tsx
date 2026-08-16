import { Badge } from "@/components/ui/badge";
import { ACTOR_STATUS, APP_STATUS } from "@/lib/labels";
import type { ActorStatus, ApplicationStatus } from "@/lib/types";

export function ActorStatusBadge({ status }: { status: ActorStatus }) {
  const variant =
    status === "approved"
      ? "default"
      : status === "pending"
        ? "secondary"
        : "destructive";
  return <Badge variant={variant}>{ACTOR_STATUS[status]}</Badge>;
}

export function AppStatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant="outline">{APP_STATUS[status]}</Badge>;
}
