import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const base = '/form-iphone-preview/';
const origin = 'https://ertenan.github.io';
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.start_url, base, 'Installation must open the project path');
assert.equal(manifest.scope, base, 'Installation scope must stay inside the project');
assert.equal(manifest.id, base, 'Installation identity must remain stable');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const path = new URL(icon.src, `${origin}${base}manifest.webmanifest`).pathname;
  assert.ok(path.startsWith(base), `Icon is outside the project: ${path}`);
  assert.ok(existsSync(resolve('dist', path.slice(base.length))), `Icon file is missing: ${path}`);
}
const html = readFileSync('dist/index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (url.startsWith('data:') || url.startsWith('https:')) continue;
  assert.ok(url.startsWith(base), `Asset points outside the Pages project: ${url}`);
  assert.ok(existsSync(resolve('dist', url.slice(base.length))), `Asset is missing: ${url}`);
}
assert.ok(readFileSync('dist/sw.js', 'utf8').includes(`${base}index.html`), 'Offline navigation fallback must use the project path');
console.log('Pages build verified: assets, installation scope, icons and offline fallback.');
