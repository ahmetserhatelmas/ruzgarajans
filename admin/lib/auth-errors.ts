type AuthLike =
  | string
  | {
      message?: string;
      msg?: string;
      code?: string | number;
      error_code?: string;
      error?: string;
      error_description?: string;
    }
  | null
  | undefined;

function hay(error: AuthLike) {
  if (error == null) return "";
  if (typeof error === "string") return error.toLowerCase();
  return [
    error.code,
    error.error_code,
    error.message,
    error.msg,
    error.error,
    error.error_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function authErrorTr(error: AuthLike) {
  const text = hay(error);
  if (
    text.includes("invalid_credentials") ||
    text.includes("invalid_grant") ||
    text.includes("invalid login") ||
    text.includes("invalid credentials") ||
    text.includes("wrong password") ||
    text.includes("email or password")
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
  if (/[a-z]/i.test(text) && /(invalid|failed|error|unauthorized)/i.test(text)) {
    return "Giriş yapılamadı.";
  }
  return text.trim() || "Giriş yapılamadı.";
}
