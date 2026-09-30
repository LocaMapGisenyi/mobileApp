import { expect, it } from 'vitest';
import { TtlCache } from '../src/lib/cache';
it('expires entries, bounds memory, and invalidates all cached data', () => {
  let now = 0;
  const cache = new TtlCache<string>(100, 2, () => now);
  cache.set('a', 'A');
  expect(cache.get('a')).toBe('A');
  now = 101;
  expect(cache.get('a')).toBeUndefined();
  cache.set('b', 'B');
  cache.set('c', 'C');
  cache.set('d', 'D');
  expect(cache.get('b')).toBeUndefined();
  cache.clear();
  expect(cache.get('d')).toBeUndefined();
});
