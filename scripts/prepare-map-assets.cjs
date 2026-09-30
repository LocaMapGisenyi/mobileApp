// Expo serves public/ in development and copies it into the web export.
// Keep the worker and its shared module from the same installed MapLibre version.
const { copyFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const packageRoot = path.dirname(require.resolve('maplibre-gl/package.json'));
const destination = path.join(__dirname, '..', 'public', 'maplibre');
mkdirSync(destination, { recursive: true });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(packageRoot, 'dist', name), path.join(destination, name));
}
copyFileSync(path.join(packageRoot, 'LICENSE.txt'), path.join(destination, 'LICENSE.txt'));
console.log('MapLibre worker assets prepared for Expo web.');
