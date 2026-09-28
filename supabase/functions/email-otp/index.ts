/// <reference path="../deno.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

type Purpose = 'signup' | 'reset';

type SignupPayload = {
  password?: string;
  fullName?: string;
  phone?: string;
  locale?: string;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomDigits(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => (b % 10).toString()).join('');
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function copy(locale: string, purpose: Purpose, code: string) {
  const tr = !locale.toLowerCase().startsWith('en');
  if (purpose === 'signup') {
    return {
      subject: tr ? 'Rüzgar Oyunculuk kayıt kodunuz' : 'Your Rüzgar Oyunculuk signup code',
      text: tr
        ? `Kayıt kodunuz: ${code}\n\nBu kod 15 dakika geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.`
        : `Your signup code is ${code}.\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
    };
  }
  return {
    subject: tr ? 'Rüzgar Oyunculuk şifre sıfırlama kodunuz' : 'Your Rüzgar Oyunculuk password reset code',
    text: tr
      ? `Şifre sıfırlama kodunuz: ${code}\n\nBu kod 15 dakika geçerlidir. Siz istemediyseniz bu e-postayı yok sayabilirsiniz.`
      : `Your password reset code is ${code}.\n\nIt expires in 15 minutes. If you did not request this, you can ignore this email.`,
  };
}

async function sendResend(to: string, subject: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('resend_not_configured');
  const from =
    Deno.env.get('RESEND_FROM') ?? 'Rüzgar Oyunculuk <info@ruzgaroyunculuk.com>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error('resend failed', res.status, detail);
    throw new Error('email_send_failed');
  }
}

async function findProfileId(admin: ReturnType<typeof adminClient>, email: string) {
  const { data } = await admin.from('profiles').select('id').ilike('email', email).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
}

async function requestCode(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const purpose = body.purpose === 'reset' ? 'reset' : 'signup';
  const locale = String(body.locale ?? 'tr');
  if (!isEmail(email)) return json({ ok: false, code: 'invalid_email' });

  const admin = adminClient();
  const existingId = await findProfileId(admin, email);

  if (purpose === 'signup') {
    if (existingId) return json({ ok: false, code: 'already_registered' });
    const { data: existingOtp } = await admin
      .from('email_otps')
      .select('payload')
      .eq('email', email)
      .eq('purpose', 'signup')
      .maybeSingle();
    const stored = (existingOtp as { payload?: SignupPayload } | null)?.payload;
    const password = String(body.password ?? stored?.password ?? '');
    const fullName = String(body.fullName ?? stored?.fullName ?? '').trim();
    if (fullName.length < 2) return json({ ok: false, code: 'invalid_name' });
    if (password.length < 6) return json({ ok: false, code: 'weak_password' });
    body.password = password;
    body.fullName = fullName;
    if (!body.phone && stored?.phone) body.phone = stored.phone;
  } else if (!existingId) {
    return json({ ok: false, code: 'email_not_found' });
  }

  const { data: current } = await admin
    .from('email_otps')
    .select('last_sent_at')
    .eq('email', email)
    .eq('purpose', purpose)
    .maybeSingle();

  const lastSent = current ? new Date(String((current as { last_sent_at: string }).last_sent_at)).getTime() : 0;
  const waitMs = lastSent + RESEND_COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    return json({ ok: false, code: 'cooldown', retryAfter: Math.ceil(waitMs / 1000) });
  }

  const code = randomDigits(6);
  const codeHash = await sha256(`${purpose}:${email}:${code}`);
  const payload: SignupPayload =
    purpose === 'signup'
      ? {
          password: String(body.password ?? ''),
          fullName: String(body.fullName ?? '').trim(),
          phone: String(body.phone ?? '').trim(),
          locale,
        }
      : { locale };

  const { error } = await admin.from('email_otps').upsert(
    {
      email,
      purpose,
      code_hash: codeHash,
      payload,
      reset_token_hash: null,
      attempts: 0,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
      last_sent_at: new Date().toISOString(),
    },
    { onConflict: 'email,purpose' }
  );
  if (error) {
    console.error('otp upsert failed', error);
    return json({ ok: false, code: 'server_error' });
  }

  const mail = copy(locale, purpose, code);
  await sendResend(email, mail.subject, mail.text);
  return json({ ok: true });
}

async function verifyCode(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const purpose = body.purpose === 'reset' ? 'reset' : 'signup';
  const code = String(body.code ?? '').replace(/\D/g, '');
  if (!isEmail(email) || code.length !== 6) return json({ ok: false, code: 'invalid_code' });

  const admin = adminClient();
  const { data: row } = await admin
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('purpose', purpose)
    .maybeSingle();

  if (!row) return json({ ok: false, code: 'invalid_code' });

  const record = row as {
    id: string;
    code_hash: string;
    payload: SignupPayload;
    attempts: number;
    expires_at: string;
  };

  if (new Date(record.expires_at).getTime() < Date.now()) {
    await admin.from('email_otps').delete().eq('id', record.id);
    return json({ ok: false, code: 'expired' });
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await admin.from('email_otps').delete().eq('id', record.id);
    return json({ ok: false, code: 'too_many_attempts' });
  }

  const incoming = await sha256(`${purpose}:${email}:${code}`);
  if (incoming !== record.code_hash) {
    await admin
      .from('email_otps')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
    return json({ ok: false, code: 'invalid_code' });
  }

  if (purpose === 'signup') {
    const password = record.payload?.password ?? '';
    const fullName = record.payload?.fullName ?? '';
    const phone = record.payload?.phone ?? '';
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: 'actor' },
    });
    if (error) {
      const text = error.message.toLowerCase();
      if (text.includes('already')) return json({ ok: false, code: 'already_registered' });
      console.error('create user failed', error);
      return json({ ok: false, code: 'server_error' });
    }
    if (created.user?.id && phone) {
      await admin.from('profiles').update({ phone, full_name: fullName }).eq('id', created.user.id);
    }
    await admin.from('email_otps').delete().eq('id', record.id);
    const { data: sessionData, error: sessionError } = await admin.auth.signInWithPassword({
      email,
      password,
    });
    if (sessionError || !sessionData.session) {
      return json({ ok: true, next: 'signin' });
    }
    return json({
      ok: true,
      next: 'session',
      accessToken: sessionData.session.access_token,
      refreshToken: sessionData.session.refresh_token,
    });
  }

  const resetToken = randomDigits(24);
  const resetTokenHash = await sha256(`reset-token:${email}:${resetToken}`);
  await admin
    .from('email_otps')
    .update({
      reset_token_hash: resetTokenHash,
      attempts: 0,
      expires_at: new Date(Date.now() + TTL_MS).toISOString(),
    })
    .eq('id', record.id);
  return json({ ok: true, resetToken });
}

async function completeReset(body: Record<string, unknown>) {
  const email = normalizeEmail(body.email);
  const resetToken = String(body.resetToken ?? '');
  const password = String(body.password ?? '');
  if (!isEmail(email) || !resetToken) return json({ ok: false, code: 'invalid_code' });
  if (password.length < 6) return json({ ok: false, code: 'weak_password' });

  const admin = adminClient();
  const { data: row } = await admin
    .from('email_otps')
    .select('*')
    .eq('email', email)
    .eq('purpose', 'reset')
    .maybeSingle();

  if (!row) return json({ ok: false, code: 'invalid_code' });
  const record = row as {
    id: string;
    reset_token_hash: string | null;
    expires_at: string;
  };
  if (!record.reset_token_hash || new Date(record.expires_at).getTime() < Date.now()) {
    await admin.from('email_otps').delete().eq('id', record.id);
    return json({ ok: false, code: 'expired' });
  }

  const incoming = await sha256(`reset-token:${email}:${resetToken}`);
  if (incoming !== record.reset_token_hash) return json({ ok: false, code: 'invalid_code' });

  const userId = await findProfileId(admin, email);
  if (!userId) return json({ ok: false, code: 'email_not_found' });

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) {
    console.error('password update failed', error);
    return json({ ok: false, code: 'server_error' });
  }
  await admin.from('email_otps').delete().eq('id', record.id);
  return json({ ok: true });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? 'request');
    if (action === 'request') return await requestCode(body);
    if (action === 'verify') return await verifyCode(body);
    if (action === 'complete_reset') return await completeReset(body);
    return json({ ok: false, code: 'invalid_action' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server_error';
    if (message === 'resend_not_configured' || message === 'email_send_failed') {
      return json({ ok: false, code: message });
    }
    console.error(error);
    return json({ ok: false, code: 'server_error' });
  }
});
