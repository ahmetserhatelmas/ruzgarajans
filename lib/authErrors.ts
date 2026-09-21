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

function extract(error: unknown): string {
  if (error == null) return '';
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return String(error);
  const o = error as Record<string, unknown>;
  return [
    o.code,
    o.error_code,
    o.message,
    o.msg,
    o.error,
    o.error_description,
  ]
    .filter((v) => v != null && v !== '')
    .map(String)
    .join(' ');
}

function hay(error: unknown) {
  return extract(error).toLowerCase();
}

function looksEnglish(text: string) {
  return /(invalid|credentials|failed|permission|denied|network|unauthorized|forbidden|not found|already registered|rate limit|password should|email not confirmed)/i.test(
    text,
  );
}

/** i18n key for a Supabase auth error, or null if it is not an auth error. */
export function authErrorKey(error: AuthLike | unknown): string | null {
  const text = hay(error);
  if (!text) return null;
  if (
    text.includes('invalid_credentials') ||
    text.includes('invalid_grant') ||
    text.includes('invalid login') ||
    text.includes('invalid credentials') ||
    text.includes('wrong password') ||
    text.includes('incorrect password') ||
    text.includes('email or password')
  ) {
    return 'auth.invalidCredentials';
  }
  if (text.includes('email_not_confirmed') || text.includes('email not confirmed')) {
    return 'auth.emailNotConfirmed';
  }
  if (text.includes('user_already_exists') || text.includes('already registered')) {
    return 'auth.alreadyRegistered';
  }
  if (text.includes('weak_password') || text.includes('password should be')) {
    return 'auth.weakPassword';
  }
  if (text.includes('over_request') || text.includes('too many') || text.includes('rate limit')) {
    return 'auth.tooManyAttempts';
  }
  if (
    text.includes('login') &&
    (text.includes('fail') || text.includes('error') || text.includes('auth'))
  ) {
    return 'auth.loginFailed';
  }
  return null;
}

type TFn = (key: string) => string;

/** Never show vendor English when the UI language is Turkish. */
export function localizedError(t: TFn, error: unknown, fallbackKey = 'common.error'): string {
  const key = authErrorKey(error);
  if (key) return t(key);
  const raw = extract(error).trim();
  if (raw && !looksEnglish(raw)) return raw;
  return t(fallbackKey);
}
