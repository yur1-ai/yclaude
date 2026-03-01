import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/cli.ts'],
  format: ['esm'],
  target: 'node24',
  clean: true,
  dts: { entry: ['src/index.ts'] },
  sourcemap: false,
  noExternal: [/.*/], // Bundle ALL runtime deps — required for cold npx execution
  // Inject a proper createRequire-based `require` at the top of each output file so that
  // CJS packages bundled via noExternal can still call require('node-builtin') at runtime.
  // The injected `require` override replaces the broken __require shim in ESM context.
  banner: {
    js: `import { createRequire as __createRequire } from 'node:module';
const require = __createRequire(import.meta.url);`,
  },
});
