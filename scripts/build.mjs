import { build } from 'esbuild';
import { mkdir, copyFile, cp, access } from 'node:fs/promises';
try { await access('extension/assets/manifest.json'); }
catch { throw new Error('Run npm run assets first to prepare the original local assets.'); }
await mkdir('dist', { recursive: true });
await build({ entryPoints: { content: 'extension/src/content/index.ts', background: 'extension/src/background/index.ts',
  studio: 'extension/src/panel/index.ts', popup: 'extension/src/popup/index.ts' },
  bundle: true, outdir: 'dist', target: 'chrome116', format: 'iife', sourcemap: true });
for (const name of ['manifest.json', 'studio.html', 'studio.css', 'popup.html']) await copyFile(`extension/${name}`, `dist/${name}`);
await cp('extension/assets', 'dist/assets', { recursive: true });
await copyFile('THIRD_PARTY_NOTICES.md', 'dist/THIRD_PARTY_NOTICES.md');
await cp('engine/licenses', 'dist/licenses', { recursive: true });
await copyFile('LICENSE', 'dist/LICENSE');
console.log('Load the dist directory as an unpacked extension.');
