import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function parseNewPassword(formData: FormData, required: boolean) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("password_confirm") ?? "");
  if (!password && !confirm) {
    return required ? { password: "", error: "Şifre gerekli." } : { password: "" };
  }
  if (password.length < 8) {
    return { password: "", error: "Şifre en az 8 karakter olmalı." };
  }
  if (password !== confirm) {
    return { password: "", error: "Şifreler eşleşmiyor." };
  }
  return { password };
}

export async function createAuthUser(email: string, password: string, fullName: string) {
  const service = createServiceClient();
  if (service) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "admin" },
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "Kullanıcı oluşturulamadı." };
    return { userId: data.user.id };
  }

  const anon = createAnonAuthClient();
  const { data, error } = await anon.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "admin" } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: "Kullanıcı oluşturulamadı." };
  return { userId: data.user.id };
}

export async function setAuthPassword(userId: string, password: string) {
  const service = createServiceClient();
  if (!service) {
    return { missingServiceRole: true as const };
  }
  const { error } = await service.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return {};
}
