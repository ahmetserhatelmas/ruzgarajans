import { createHash } from "crypto";

const PIN_PREFIX = "ruzgar-share-pin:";

export function isSharePin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function hashSharePin(pin: string) {
  return createHash("sha256").update(`${PIN_PREFIX}${pin}`, "utf8").digest("hex");
}

export function shareUnlockCookieName(token: string) {
  return `as_${createHash("sha256").update(token).digest("hex").slice(0, 24)}`;
}
