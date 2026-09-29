import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { OtpPurpose } from '@/lib/emailOtp';

const OTP_KEY = 'pending_email_otp';
const RESET_KEY = 'pending_password_reset';
const TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

export type PendingOtp = {
  email: string;
  purpose: OtpPurpose;
  expiresAt: number;
  lastSentAt: number;
};

export type PendingReset = {
  email: string;
  resetToken: string;
  expiresAt: number;
};

export type AuthResume =
  | { pathname: '/(auth)/verify-code'; params: { purpose: OtpPurpose; email: string } }
  | { pathname: '/(auth)/reset-password'; params: { email: string } };

async function writeSecret(key: string, value: string) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch (error) {
    console.warn('pendingAuth write failed', error);
  }
}

async function readSecret(key: string) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      return await SecureStore.getItemAsync(key);
    }
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.warn('pendingAuth read failed', error);
    return null;
  }
}

async function removeSecret(key: string) {
  try {
    if (await SecureStore.isAvailableAsync()) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('pendingAuth remove failed', error);
  }
}

function parseJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function remainingResendSeconds(lastSentAt: number) {
  return Math.max(0, Math.ceil((lastSentAt + RESEND_COOLDOWN_MS - Date.now()) / 1000));
}

export async function setPendingOtp(input: { email: string; purpose: OtpPurpose }) {
  const now = Date.now();
  const row: PendingOtp = {
    email: input.email.trim().toLowerCase(),
    purpose: input.purpose,
    lastSentAt: now,
    expiresAt: now + TTL_MS,
  };
  await removeSecret(RESET_KEY);
  await writeSecret(OTP_KEY, JSON.stringify(row));
}

export async function getPendingOtp(): Promise<PendingOtp | null> {
  const row = parseJson(await readSecret(OTP_KEY));
  const email = String(row?.email ?? '').trim().toLowerCase();
  const purpose: OtpPurpose = row?.purpose === 'reset' ? 'reset' : 'signup';
  const expiresAt = Number(row?.expiresAt ?? 0);
  const lastSentAt = Number(row?.lastSentAt ?? 0);
  if (!email || !expiresAt) {
    await removeSecret(OTP_KEY);
    return null;
  }
  if (expiresAt <= Date.now()) {
    await removeSecret(OTP_KEY);
    return null;
  }
  return { email, purpose, expiresAt, lastSentAt };
}

export async function clearPendingOtp() {
  await removeSecret(OTP_KEY);
}

export async function setPendingReset(input: { email: string; resetToken: string }) {
  const row: PendingReset = {
    email: input.email.trim().toLowerCase(),
    resetToken: input.resetToken,
    expiresAt: Date.now() + TTL_MS,
  };
  await removeSecret(OTP_KEY);
  await writeSecret(RESET_KEY, JSON.stringify(row));
}

export async function getPendingReset(): Promise<PendingReset | null> {
  const row = parseJson(await readSecret(RESET_KEY));
  const email = String(row?.email ?? '').trim().toLowerCase();
  const resetToken = String(row?.resetToken ?? '');
  const expiresAt = Number(row?.expiresAt ?? 0);
  if (!email || !resetToken || !expiresAt) {
    await removeSecret(RESET_KEY);
    return null;
  }
  if (expiresAt <= Date.now()) {
    await removeSecret(RESET_KEY);
    return null;
  }
  return { email, resetToken, expiresAt };
}

export async function clearPendingReset() {
  await removeSecret(RESET_KEY);
}

export async function clearAllPendingAuth() {
  await Promise.all([removeSecret(OTP_KEY), removeSecret(RESET_KEY)]);
}

export async function getAuthResumeHref(): Promise<AuthResume | null> {
  const reset = await getPendingReset();
  if (reset) {
    return { pathname: '/(auth)/reset-password', params: { email: reset.email } };
  }
  const otp = await getPendingOtp();
  if (otp) {
    return { pathname: '/(auth)/verify-code', params: { purpose: otp.purpose, email: otp.email } };
  }
  return null;
}
