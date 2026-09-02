type AuthLike = { message?: string; code?: string } | null | undefined;

function hay(error: AuthLike) {
  return `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
}

export function authErrorTr(error: AuthLike) {
  const text = hay(error);
  if (
    text.includes("invalid_credentials") ||
    text.includes("invalid login") ||
    text.includes("invalid credentials")
  ) {
    return "Şifre yanlış.";
  }
  if (text.includes("email_not_confirmed") || text.includes("email not confirmed")) {
    return "E-posta henüz onaylanmadı.";
  }
  if (text.includes("user_already_exists") || text.includes("already registered")) {
    return "Bu e-posta zaten kayıtlı.";
  }
  if (text.includes("weak_password") || text.includes("password should be")) {
    return "Şifre en az 6 karakter olmalı.";
  }
  if (text.includes("over_request") || text.includes("too many") || text.includes("rate limit")) {
    return "Çok fazla deneme. Biraz sonra tekrar dene.";
  }
  return "Giriş yapılamadı.";
}
