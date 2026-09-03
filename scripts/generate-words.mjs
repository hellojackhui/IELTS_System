// Regenerate packages/core/src/data/words.ts from words.json (the raw source).
// Run: node scripts/generate-words.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(resolve(root, 'words.json'), 'utf8'));

const lines = [
  '// Auto-generated from words.json by scripts/generate-words.mjs. Do not edit by hand.',
  '// Format: [word, rawTranslation]. Append-only: never reorder or the ids shift.',
  'export const RAW_WORDS: [string, string][] = [',
  ...data.map(([w, t]) => `  [${JSON.stringify(w)}, ${JSON.stringify(t)}],`),
  '];',
  '',
];

writeFileSync(resolve(root, 'packages/core/src/data/words.ts'), lines.join('\n'));
console.log(`Wrote ${data.length} words to packages/core/src/data/words.ts`);
