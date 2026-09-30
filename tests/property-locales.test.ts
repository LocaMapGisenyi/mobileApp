import { expect, it } from 'vitest';
import fr from '../src/locales/fr.json';
import en from '../src/locales/en.json';
import rw from '../src/locales/rw.json';
import sw from '../src/locales/sw.json';
function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, item]) => item && typeof item === 'object' ? flatten(item as Record<string, unknown>, `${prefix}${key}.`) : [`${prefix}${key}`]).sort();
}
it('provides the same translation keys in every supported language', () => {
  const expected = flatten(fr);
  for (const locale of [en, rw, sw]) expect(flatten(locale)).toEqual(expected);
});
