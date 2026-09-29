import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_SECONDS = 15 * 60;
const DAY_SECONDS = 24 * 60 * 60;

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return ip.slice(0, 64);
}

export function isOtpAppAuthorized(request: Request) {
  const expected = process.env.EMAIL_OTP_APP_SECRET ?? "";
  if (!expected) {
    console.warn("EMAIL_OTP_APP_SECRET missing; OTP route is unlocked");
    return true;
  }
  const got = request.headers.get("x-ruzgar-otp-key") ?? "";
  if (!got) return false;
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(got).digest();
  return timingSafeEqual(left, right);
}

function payloadKey() {
  const raw =
    process.env.EMAIL_OTP_PAYLOAD_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EMAIL_OTP_APP_SECRET ||
    "";
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string) {
  if (!plain) return "";
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", payloadKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSecret(value: string) {
  if (!value) return "";
  if (!value.startsWith("v1:")) return value;
  try {
    const parts = value.split(":");
    if (parts.length !== 4) return "";
    const iv = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    const data = Buffer.from(parts[3], "base64url");
    const decipher = createDecipheriv("aes-256-gcm", payloadKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}

type RateResult = { ok: true } | { ok: false; retryAfter: number };

export async function hitOtpRateLimit(
  admin: SupabaseClient,
  bucket: string,
  limit: number,
  windowSeconds = WINDOW_SECONDS
): Promise<RateResult> {
  const { data, error } = await admin.rpc("hit_otp_rate_limit", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.warn("otp rate limit rpc missing or failed", error.message);
    return { ok: true };
  }
  const row = (data ?? {}) as { ok?: boolean; retryAfter?: number };
  if (row.ok === false) {
    return { ok: false, retryAfter: Math.max(1, Number(row.retryAfter) || 60) };
  }
  return { ok: true };
}

export async function limitOtpAction(
  admin: SupabaseClient,
  ip: string,
  action: string
): Promise<RateResult> {
  const perWindow =
    action === "request" ? 8 : action === "verify" ? 30 : 10;
  const perDay = action === "request" ? 25 : 80;
  const short = await hitOtpRateLimit(admin, `${action}:${ip}`, perWindow, WINDOW_SECONDS);
  if (!short.ok) return short;
  return hitOtpRateLimit(admin, `${action}-day:${ip}`, perDay, DAY_SECONDS);
}
