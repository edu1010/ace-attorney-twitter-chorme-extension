import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { zipSync } from 'fflate';

const files = Object.create(null);
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(source, `${name}/`);
    else if (entry.isFile() && !/\.(zip|map)$/i.test(name)) files[name] = await readFile(source);
  }
}
await collect('dist');
const manifests = Object.keys(files).filter(name => /(^|\/)manifest\.json$/i.test(name));
if (manifests.length !== 1 || manifests[0] !== 'manifest.json') {
  throw new Error(`Expected only the root manifest.json; found: ${manifests.join(', ')}`);
}
if (!files['assets/catalog.json']) throw new Error('Missing assets/catalog.json. Run npm run assets first.');
const output = 'dist/AceAttorTWExtension.zip';
await writeFile(output, zipSync(files));
console.log(`Created ${output} (${Object.keys(files).length} files).`);
