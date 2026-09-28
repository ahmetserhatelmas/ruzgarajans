import { createHash, randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

const TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type Purpose = "signup" | "reset";

type SignupPayload = {
  password?: string;
  fullName?: string;
  phone?: string;
  locale?: string;
};

export type OtpResult = Record<string, unknown> & {
  ok: boolean;
  code?: string;
  retryAfter?: number;
};

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function randomDigits(length: number) {
  return Array.from({ length }, () => String(randomInt(0, 10))).join("");
}

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function copy(locale: string, purpose: Purpose, code: string) {
  const tr = !locale.toLowerCase().startsWith("en");
  if (purpose === "signup") {
    return {
      subject: tr ? "Rüzgar Oyunculuk kayıt kodunuz" : "Your Rüzgar Oyunculuk signup code",
      text: tr
        ? `Kayıt kodunuz: ${code}\n\nBu kod 15 dakika geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.`
        : `Your signup code is ${code}.\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
    };
  }
  return {
    subject: tr
      ? "Rüzgar Oyunculuk şifre sıfırlama kodunuz"
      : "Your Rüzgar Oyunculuk password reset code",
    text: tr
      ? `Şifre sıfırlama kodunuz: ${code}\n\nBu kod 15 dakika geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.`
      : `Your password reset code is ${code}.\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
  };
}

async function sendResend(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("resend_not_configured");
  const from =
    process.env.RESEND_FROM ?? "Rüzgar Oyunculuk <info@ruzgaroyunculuk.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error("resend failed", res.status, detail);
    throw new Error("email_send_failed");
  }
}

async function findProfileId(admin: SupabaseClient, email: string) {
  const { data } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
  return data?.id ?? null;
}

async function requestCode(admin: SupabaseClient, body: Record<string, unknown>): Promise<OtpResult> {
  const email = normalizeEmail(body.email);
  const purpose: Purpose = body.purpose === "reset" ? "reset" : "signup";
  const locale = String(body.locale ?? "tr");
  if (!isEmail(email)) return { ok: false, code: "invalid_email" };

  const existingId = await findProfileId(admin, email);

  if (purpose === "signup") {
    if (existingId) return { ok: false, code: "already_registered" };
    const { data: existingOtp } = await admin
      .from("email_otps")
      .select("payload")
      .eq("email", email)
      .eq("purpose", "signup")
      .maybeSingle();
    const stored = (existingOtp?.payload ?? {}) as SignupPayload;
    const password = String(body.password ?? stored.password ?? "");
    const fullName = String(body.fullName ?? stored.fullName ?? "").trim();
    if (fullName.length < 2) return { ok: false, code: "invalid_name" };
    if (password.length < 6) return { ok: false, code: "weak_password" };
    body.password = password;
    body.fullName = fullName;
    if (!body.phone && stored.phone) body.phone = stored.phone;
  } else if (!existingId) {
    return { ok: false, code: "email_not_found" };
  }

  const { data: current } = await admin
    .from("email_otps")
    .select("last_sent_at")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  const lastSent = current?.last_sent_at ? new Date(String(current.last_sent_at)).getTime() : 0;
  const waitMs = lastSent + RESEND_COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    return { ok: false, code: "cooldown", retryAfter: Math.ceil(waitMs / 1000) };
  }

  const code = randomDigits(6);
  const payload: SignupPayload =
    purpose === "signup"
      ? {
          password: String(body.password ?? ""),
          fullName: String(body.fullName ?? "").trim(),
          phone: String(body.phone ?? "").trim(),
          locale,
        }
      : { locale };

  const { error } = await admin.from("email_otps").upsert(
    {
      email,
      purpose,
      code_hash: sha256(`${purpose}:${email}:${code}`),
      payload,
      reset_token_hash: null,
      attempts: 0,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
      last_sent_at: new Date().toISOString(),
    },
    { onConflict: "email,purpose" },
  );
  if (error) {
    console.error("otp upsert failed", error);
    return { ok: false, code: "server_error" };
  }

  const mail = copy(locale, purpose, code);
  await sendResend(email, mail.subject, mail.text);
  return { ok: true };
}

async function verifyCode(admin: SupabaseClient, body: Record<string, unknown>): Promise<OtpResult> {
  const email = normalizeEmail(body.email);
  const purpose: Purpose = body.purpose === "reset" ? "reset" : "signup";
  const code = String(body.code ?? "").replace(/\D/g, "");
  if (!isEmail(email) || code.length !== 6) return { ok: false, code: "invalid_code" };

  const { data: row } = await admin
    .from("email_otps")
    .select("*")
    .eq("email", email)
    .eq("purpose", purpose)
    .maybeSingle();

  if (!row) return { ok: false, code: "invalid_code" };

  if (new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("email_otps").delete().eq("id", row.id);
    return { ok: false, code: "expired" };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    await admin.from("email_otps").delete().eq("id", row.id);
    return { ok: false, code: "too_many_attempts" };
  }

  if (sha256(`${purpose}:${email}:${code}`) !== row.code_hash) {
    await admin.from("email_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    return { ok: false, code: "invalid_code" };
  }

  if (purpose === "signup") {
    const payload = (row.payload ?? {}) as SignupPayload;
    const password = payload.password ?? "";
    const fullName = payload.fullName ?? "";
    const phone = payload.phone ?? "";
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: "actor" },
    });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { ok: false, code: "already_registered" };
      }
      console.error("create user failed", error);
      return { ok: false, code: "server_error" };
    }
    if (created.user?.id && phone) {
      await admin.from("profiles").update({ phone, full_name: fullName }).eq("id", created.user.id);
    }
    await admin.from("email_otps").delete().eq("id", row.id);
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email,
      password,
    });
    if (sessionError || !sessionData.session) {
      return { ok: true, next: "signin" };
    }
    return {
      ok: true,
      next: "session",
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    };
  }

  const resetToken = randomDigits(24);
  await admin
    .from("email_otps")
    .update({
      reset_token_hash: sha256(`reset-token:${email}:${resetToken}`),
      attempts: 0,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    })
    .eq("id", row.id);
  return { ok: true, resetToken };
}

async function completeReset(admin: SupabaseClient, body: Record<string, unknown>): Promise<OtpResult> {
  const email = normalizeEmail(body.email);
  const resetToken = String(body.resetToken ?? "");
  const password = String(body.password ?? "");
  if (!isEmail(email) || !resetToken) return { ok: false, code: "invalid_code" };
  if (password.length < 6) return { ok: false, code: "weak_password" };

  const { data: row } = await admin
    .from("email_otps")
    .select("*")
    .eq("email", email)
    .eq("purpose", "reset")
    .maybeSingle();

  if (!row) return { ok: false, code: "invalid_code" };
  if (!row.reset_token_hash || new Date(row.expires_at).getTime() < Date.now()) {
    await admin.from("email_otps").delete().eq("id", row.id);
    return { ok: false, code: "expired" };
  }
  if (sha256(`reset-token:${email}:${resetToken}`) !== row.reset_token_hash) {
    return { ok: false, code: "invalid_code" };
  }

  const userId = await findProfileId(admin, email);
  if (!userId) return { ok: false, code: "email_not_found" };

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    console.error("password update failed", error);
    return { ok: false, code: "server_error" };
  }
  await admin.from("email_otps").delete().eq("id", row.id);
  return { ok: true };
}

export async function handleEmailOtp(body: Record<string, unknown>): Promise<OtpResult> {
  const admin = createServiceClient();
  if (!admin) return { ok: false, code: "server_error" };
  const action = String(body.action ?? "request");
  if (action === "request") return requestCode(admin, body);
  if (action === "verify") return verifyCode(admin, body);
  if (action === "complete_reset") return completeReset(admin, body);
  return { ok: false, code: "invalid_action" };
}
