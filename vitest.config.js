import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{js,jsx}'],
    globals: false,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/server/**'],
      exclude: ['src/**/*.test.*', 'src/server/**/_lib/**'],
    },
  },
});
