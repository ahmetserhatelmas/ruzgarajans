type AuthLike = { message?: string; code?: string } | null | undefined;

function hay(error: AuthLike) {
  return `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
}

/** i18n key for a Supabase auth error — never pass English through. */
export function authErrorKey(error: AuthLike) {
  const text = hay(error);
  if (
    text.includes('invalid_credentials') ||
    text.includes('invalid login') ||
    text.includes('invalid credentials')
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
  return 'auth.loginFailed';
}
