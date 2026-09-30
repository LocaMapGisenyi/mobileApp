import { expect, it } from 'vitest';
import { tomtomStyle } from '../src/lib/tomtomMap';

it('requires a key before allowing any tile request', () => {
  expect(() => tomtomStyle('')).toThrow();
  expect(() => tomtomStyle('   ')).toThrow();
});

it('uses TomTom Orbis v2 without a fallback tile provider', () => {
  const style = tomtomStyle('test-key');
  expect(Object.keys(style.sources)).toEqual(['tomtom']);
  const source = style.sources.tomtom;
  expect(source).toMatchObject({ type: 'raster', tileSize: 256, maxzoom: 22 });
  if (source.type !== 'raster') throw new Error('Unexpected source');
  expect(source.tiles).toEqual(['https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}?apiVersion=2&style=street-light&tileSize=256&key=test-key']);
  expect(source.attribution).toContain('TomTom');
});

it('encodes the key so it cannot inject another request parameter', () => {
  const source = tomtomStyle('a&style=other').sources.tomtom;
  if (source.type !== 'raster') throw new Error('Unexpected source');
  const url = new URL(source.tiles![0]);
  expect(url.searchParams.get('key')).toBe('a&style=other');
  expect(url.searchParams.getAll('style')).toEqual(['street-light']);
});
