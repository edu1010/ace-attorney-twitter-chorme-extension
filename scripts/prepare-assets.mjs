// Build-time only. No remote code or assets are fetched by the installed extension.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { parse } from 'smol-toml';

const url = 'https://dl.luismayo.com/assetsv4.zip';
const digest = 'f62467c90643e72bd0138e58d269c73d8ac1ccc35734cd44e421b5c7b82f96bb';
await mkdir('.cache', { recursive: true });
let archive;
try { archive = await readFile('.cache/assetsv4.zip'); }
catch {
  console.log('Downloading the original objection_engine asset pack (about 85 MB)…');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Asset download: HTTP ${response.status}`);
  archive = Buffer.from(await response.arrayBuffer());
  if (archive.length > 150e6) throw new Error('Asset archive is unexpectedly large');
  await writeFile('.cache/assetsv4.zip', archive);
}
if (createHash('sha256').update(archive).digest('hex') !== digest)
  throw new Error('Asset pack checksum mismatch. Do not use an unverified replacement.');
const files = unzipSync(archive);
const output = 'extension/assets';
async function copy(name) {
  if (!files[name]) throw new Error(`Missing upstream asset: ${name}`);
  const target = path.join(output, name);
  if (!path.resolve(target).startsWith(path.resolve(output) + path.sep)) throw new Error('Unsafe asset path');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, files[name]);
}
const manifest = { characters: [], priority: ['phoenix', 'edgeworth', 'larry'], relaxed: '', tense: '' };
for (const name of Object.keys(files).filter(n => /^characters\/[^_/][^/]*\/config.toml$/.test(n)).sort()) {
  const id = name.split('/')[1];
  const config = parse(new TextDecoder().decode(files[name]));
  if (!['left', 'right', 'center', 'judge'].includes(config.location)) continue;
  const available = pose => ['idle', 'talk'].every(mode => files[`characters/${id}/${id}-${pose}-${mode}.gif`]);
  const allowed = poses => (poses ?? []).filter(p => !(config.sprites.spoiler ?? []).includes(p) && available(p));
  const neutrals = allowed(config.sprites.neutral);
  const neutral = neutrals.includes('normal') ? 'normal' : neutrals[0] ?? allowed(config.sprites.positive)[0];
  const poses = allowed([...config.sprites.neutral ?? [], ...config.sprites.positive ?? [], ...config.sprites.negative ?? []]);
  const dramatic = poses.includes('pointing') ? 'pointing' : allowed(config.sprites.negative)[0] ?? neutral;
  if (!neutral) continue;
  for (const pose of new Set([neutral, dramatic])) for (const mode of ['idle', 'talk'])
    await copy(`characters/${id}/${id}-${pose}-${mode}.gif`);
  const objection = ['wav', 'mp3'].map(ext => `characters/${id}/objection.${ext}`).find(n => files[n]) ?? 'sound/objection-generic.wav';
  await copy(objection);
  manifest.characters.push({ id, name: config.display_name, location: config.location, gender: config.gender, neutral, dramatic, objection });
}
for (const name of ['bg/bg_main.png', 'bg/bg_judge.png', 'bg/bg_action.png', 'fg/pr_bench.png', 'fg/witness_stand.png',
  'textbox/mainbox.png', 'textbox/nametag_left.png', 'textbox/nametag_center.png', 'textbox/nametag_right.png',
  'textbox/arrow.gif', 'exclamations/objection.gif', 'sound/sfx-blipmale.wav', 'sound/sfx-blipfemale.wav',
  'sound/sfx-pichoop.wav', 'sound/sfx-deskslam.wav', 'sound/objection-generic.wav',
  'textbox/font/igiari/Igiari.ttf', 'textbox/font/igiari/license.txt', 'textbox/font/igiari/readme.txt']) await copy(name);
for (const [key, stem] of [['relaxed', 'trial'], ['tense', 'press']]) {
  const name = Object.keys(files).find(n => n.startsWith(`music/pwr/${stem}.`));
  if (!name) throw new Error(`Missing music ${stem}`);
  await copy(name); manifest[key] = name;
}
await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2));
await writeFile(path.join(output, 'PROVENANCE.json'), JSON.stringify({ url, sha256: digest, engineCommit: 'ebf4a2346028df8a130b45da71eb8fa72d3a8a39' }, null, 2));
console.log(`Prepared ${manifest.characters.length} characters with original animation and audio. See THIRD_PARTY_NOTICES.md before redistribution.`);
