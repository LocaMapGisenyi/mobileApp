import type { StyleSpecification } from 'maplibre-gl';

export function tomtomStyle(key: string): StyleSpecification {
  if (!key.trim()) throw new Error('Map unavailable');
  return {
    version: 8,
    sources: {
      tomtom: {
        type: 'raster', tileSize: 256, maxzoom: 22,
        tiles: [`https://api.tomtom.com/maps/orbis/display/raster/tile/{z}/{x}/{y}?apiVersion=2&style=street-light&tileSize=256&key=${encodeURIComponent(key.trim())}`],
        attribution: '&copy; <a href="https://www.tomtom.com/legal/en_gb/product-attributions/" target="_blank" rel="noopener">TomTom</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      },
    },
    layers: [{ id: 'tomtom-map', type: 'raster', source: 'tomtom' }],
  };
}
