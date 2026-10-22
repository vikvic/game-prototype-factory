import { cp, mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Match the factory's npm build interface without bundling or changing the game.
const { values } = parseArgs({
  options: {
    outDir: { type: 'string', default: 'dist' },
    emptyOutDir: { type: 'boolean', default: false },
  },
});
const source = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const output = resolve(source, values.outDir);
if (output === source || source.startsWith(output + sep) ||
    (output.startsWith(source + sep) && output !== resolve(source, 'dist'))) {
  throw new Error('Build output must not overwrite the game source or its assets.');
}
await mkdir(output, { recursive: true });
if (await realpath(output) !== output) throw new Error('Build output cannot be a link.');
// The factory supplies a fresh directory. Refuse to erase an existing directory.
if (values.emptyOutDir && (await readdir(output)).length) {
  throw new Error('Expected an empty build output directory; existing files were preserved.');
}

const manifest = JSON.parse(await readFile(resolve(source, 'assets/manifest.json'), 'utf8'));
if (!Array.isArray(manifest.items) || !manifest.items.length) throw new Error('Missing painting manifest.');
for (const item of manifest.items) {
  if (typeof item.file !== 'string') throw new Error('Painting entry is missing its filename.');
  const asset = resolve(source, 'assets', item.file);
  const withinAssets = relative(resolve(source, 'assets'), asset);
  if (withinAssets.startsWith('..') || isAbsolute(withinAssets)) throw new Error('Invalid painting path.');
  await readFile(asset); // A missing vendored painting must fail the build, not the player.
}
const pages = ['index.html', 'labs.html', 'eye-graft.html', 'ops-lab.html', 'gaze-lab.html', 'painterly-lab.html'];
for (const page of pages) await cp(resolve(source, page), resolve(output, page));
await cp(resolve(source, 'assets'), resolve(output, 'assets'), { recursive: true });
console.log(`Anomaly Gallery: ${pages.length} pages and ${manifest.items.length} paintings -> ${output}`);
