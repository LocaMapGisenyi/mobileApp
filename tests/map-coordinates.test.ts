import { expect, it } from 'vitest';
import { validCoordinate } from '../src/lib/mapTypes';

it.each([[NaN, 29], [-1, Infinity], [91, 0], [0, 181]])('rejects unsafe map coordinates %s, %s', (latitude, longitude) => {
  expect(validCoordinate({ latitude, longitude })).toBe(false);
});
it('accepts a valid location and the zero coordinates', () => {
  expect(validCoordinate({ latitude: -1.7, longitude: 29.25 })).toBe(true);
  expect(validCoordinate({ latitude: 0, longitude: 0 })).toBe(true);
});
