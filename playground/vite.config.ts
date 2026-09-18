import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/nodeweave/' : '/',
  root: fileURLToPath(new URL('.', import.meta.url)),
  resolve: { alias: [
    { find: 'nodeweave/styles.css', replacement: fileURLToPath(new URL('../src/nodeweave.css', import.meta.url)) },
    { find: 'nodeweave', replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)) },
  ] },
  build: { outDir: 'dist', emptyOutDir: true },
}));
