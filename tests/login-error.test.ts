import { expect, it } from 'vitest';
import { loginErrorKey } from '../src/utils/loginError';

it('translates rejected credentials without revealing which credential was wrong', () => {
  expect(loginErrorKey({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe('errors.invalidCredentials');
});

it('distinguishes confirmation, rate limits and a failed network request', () => {
  expect(loginErrorKey({ code: 'email_not_confirmed' })).toBe('auth.emailUnconfirmed');
  expect(loginErrorKey({ status: 429 })).toBe('auth.tooManyAttempts');
  expect(loginErrorKey({ name: 'AuthRetryableFetchError' })).toBe('auth.connectionUnavailable');
});

it('does not show a raw server error or mislabel a service failure as a wrong password', () => {
  expect(loginErrorKey(new Error('Internal database error'))).toBe('auth.loginUnavailable');
  expect(loginErrorKey(null)).toBe('auth.loginUnavailable');
});
