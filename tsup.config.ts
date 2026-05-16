import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: true,
  splitting: true,
  treeshake: true,
  outDir: 'dist',
  target: 'node20',
  external: ['vite', 'react', 'react-dom'],
  esbuildOptions(options) {
    options.legalComments = 'none';
  },
});
