import { createHash } from "crypto";

const PIN_PREFIX = "ruzgar-share-pin:";

export function isSharePin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export function parseShareInput(raw: string) {
  let text = raw.trim();
  try {
    text = decodeURIComponent(text.replace(/\+/g, "%20"));
  } catch {
    // keep the raw value
  }
  const tokenMatch = text.match(/[a-f0-9]{32,}/i);
  const token = (tokenMatch?.[0] ?? text.split(/[\s/?#]/)[0] ?? "").trim();
  const rest = tokenMatch ? text.slice(text.indexOf(tokenMatch[0]) + tokenMatch[0].length) : text;
  const pinMatch = rest.match(/\b(\d{4})\b/);
  return { token, pin: pinMatch && isSharePin(pinMatch[1]) ? pinMatch[1] : null };
}

export function hashSharePin(pin: string) {
  return createHash("sha256").update(`${PIN_PREFIX}${pin}`, "utf8").digest("hex");
}

export function shareUnlockCookieName(token: string) {
  return `as_${createHash("sha256").update(token).digest("hex").slice(0, 24)}`;
}
