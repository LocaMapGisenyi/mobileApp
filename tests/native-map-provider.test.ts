import { expect, it } from 'vitest';
import { nativeMapProvider } from '../src/lib/nativeMapProvider';

it('uses Apple Maps on iPhone without Google credentials', () => {
  expect(nativeMapProvider('ios')).toBe('apple');
});

it('uses Google Maps on Android', () => {
  expect(nativeMapProvider('android')).toBe('google');
});
