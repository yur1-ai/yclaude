import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/cli.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  dts: { entry: ['src/index.ts'] },
  sourcemap: true,
});
