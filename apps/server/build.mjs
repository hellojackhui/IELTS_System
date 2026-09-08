import { build } from 'esbuild';

// Bundle the server into a single ESM file. @ielts/core is inlined (no runtime
// workspace-symlink / CJS-ESM interop), only the native better-sqlite3 stays
// external. The banner provides a real `require` so bundled CJS deps (e.g.
// dotenv doing require('fs')) work under ESM output.
await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/server.mjs',
  external: ['better-sqlite3'],
  banner: {
    js: "import { createRequire } from 'node:module';\nconst require = createRequire(import.meta.url);",
  },
});

console.log('Built apps/server/dist/server.mjs');
