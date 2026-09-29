export type OtpPurpose = 'signup' | 'reset';

export class EmailOtpError extends Error {
  code: string;
  retryAfter?: number;
  constructor(code: string, retryAfter?: number) {
    super(code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const ADMIN_URL = (
  process.env.EXPO_PUBLIC_ADMIN_URL ?? 'https://ruzgarajans.vercel.app'
).replace(/\/$/, '');

const OTP_APP_SECRET = process.env.EXPO_PUBLIC_OTP_APP_SECRET ?? '';

async function callOtp(body: Record<string, unknown>) {
  const res = await fetch(`${ADMIN_URL}/api/email-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ruzgar-otp-key': OTP_APP_SECRET,
    },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    code?: string;
    retryAfter?: number;
    resetToken?: string;
    next?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  if (!res.ok || payload.ok === false) {
    throw new EmailOtpError(payload.code || 'server_error', payload.retryAfter);
  }
  return payload;
}

export async function requestEmailOtp(input: {
  purpose: OtpPurpose;
  email: string;
  password?: string;
  fullName?: string;
  phone?: string;
  locale?: string;
}) {
  return callOtp({ action: 'request', ...input });
}

export async function verifyEmailOtp(input: {
  purpose: OtpPurpose;
  email: string;
  code: string;
}) {
  return callOtp({ action: 'verify', ...input });
}

export async function completePasswordReset(input: {
  email: string;
  resetToken: string;
  password: string;
}) {
  return callOtp({ action: 'complete_reset', ...input });
}
