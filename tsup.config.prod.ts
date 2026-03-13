import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

/**
 * esbuild plugin to restore `node:` prefix on node-only builtins.
 *
 * tsup's built-in `nodeProtocolPlugin` strips `node:` from ALL builtins.
 * This works for classic builtins (fs, os, path) that accept bare imports,
 * but breaks "node:-only" modules like `node:sqlite` (Node.js 22+) that
 * REQUIRE the `node:` prefix at runtime.
 */
const fixNodeOnlyBuiltins: Plugin = {
  name: 'fix-node-only-builtins',
  setup(build) {
    const nodeOnlyModules = ['sqlite', 'test', 'sea'];

    build.onEnd((result) => {
      if (!result.outputFiles) return;
      for (const file of result.outputFiles) {
        if (!file.path.endsWith('.js')) continue;
        let text = file.text;
        for (const mod of nodeOnlyModules) {
          text = text.replace(new RegExp(`(from\\s+["'])${mod}(["'])`, 'g'), `$1node:${mod}$2`);
          text = text.replace(
            new RegExp(`(require\\(["'])${mod}(["']\\))`, 'g'),
            `$1node:${mod}$2`,
          );
        }
        (file as { contents: Uint8Array }).contents = Buffer.from(text);
      }
    });
  },
};

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
  esbuildPlugins: [fixNodeOnlyBuiltins],
});
