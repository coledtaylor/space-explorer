import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest handles TypeScript natively via Vite's transform pipeline —
    // no separate ts-node or babel setup needed.
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
