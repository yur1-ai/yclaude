import { defineConfig } from 'tsup';

import type { Plugin } from 'esbuild';

/**
 * esbuild plugin to restore `node:` prefix on node-only builtins.
 *
 * tsup's built-in `nodeProtocolPlugin` strips `node:` from ALL builtins.
 * This works for classic builtins (fs, os, path) that accept bare imports,
 * but breaks "node:-only" modules like `node:sqlite` (Node.js 22+) that
 * REQUIRE the `node:` prefix at runtime.
 *
 * Since tsup's plugin runs first and returns `{ path: "sqlite", external: true }`,
 * we can't intercept it in onResolve. Instead, we post-process the output
 * to restore the prefix.
 */
const fixNodeOnlyBuiltins: Plugin = {
  name: 'fix-node-only-builtins',
  setup(build) {
    // node-only modules that require the node: prefix
    const nodeOnlyModules = ['sqlite', 'test', 'sea'];

    build.onEnd((result) => {
      if (!result.outputFiles) return;
      for (const file of result.outputFiles) {
        if (!file.path.endsWith('.js')) continue;
        let text = file.text;
        for (const mod of nodeOnlyModules) {
          // Match: from "sqlite" or require("sqlite")
          text = text.replace(
            new RegExp(`(from\\s+["'])${mod}(["'])`, 'g'),
            `$1node:${mod}$2`,
          );
          text = text.replace(
            new RegExp(`(require\\(["'])${mod}(["']\\))`, 'g'),
            `$1node:${mod}$2`,
          );
        }
        // Replace the output file contents
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
  sourcemap: true,
  esbuildPlugins: [fixNodeOnlyBuiltins],
});
