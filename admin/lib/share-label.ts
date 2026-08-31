import type { ActorShare, ApplicationShare } from "@/lib/types";

export function sharePinLabel(share: Pick<ActorShare | ApplicationShare, "note" | "pin_label">) {
  const pin = share.pin_label || share.note || "";
  return /^\d{4}$/.test(pin) ? pin : null;
}

export function shareRemainingLabel(expiresAt: string | null, now = Date.now()) {
  if (!expiresAt) return "Süresiz";
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return "Süresi doldu";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) {
    const restHours = hours % 24;
    return restHours ? `${days} gün ${restHours} saat kaldı` : `${days} gün kaldı`;
  }
  if (hours >= 1) {
    const restMinutes = minutes % 60;
    return restMinutes ? `${hours} saat ${restMinutes} dk kaldı` : `${hours} saat kaldı`;
  }
  return `${Math.max(1, minutes)} dk kaldı`;
}

export function shareActorIds(share: Pick<ActorShare, "actor_id" | "actor_ids">) {
  if (share.actor_ids?.length) return share.actor_ids;
  return share.actor_id ? [share.actor_id] : [];
}

export function shareApplicationIds(share: Pick<ApplicationShare, "application_id" | "application_ids">) {
  if (share.application_ids?.length) return share.application_ids;
  return share.application_id ? [share.application_id] : [];
}
