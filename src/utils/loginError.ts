export function loginErrorKey(error: unknown): string {
  const failure = error && typeof error === 'object'
    ? error as { code?: string; status?: number; name?: string }
    : {};
  if (failure.code === 'invalid_credentials') return 'errors.invalidCredentials';
  if (failure.code === 'email_not_confirmed') return 'auth.emailUnconfirmed';
  if (failure.status === 429 || failure.code === 'over_request_rate_limit') return 'auth.tooManyAttempts';
  if (failure.name === 'AuthRetryableFetchError') return 'auth.connectionUnavailable';
  return 'auth.loginUnavailable';
}
