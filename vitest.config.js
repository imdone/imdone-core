import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.spec.js'],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      reportOnFailure: true,
      exclude: [
        '_lib',
        'lib/**/index.*',
        'lib/**/__tests__/**',
        'lib/**/*.spec.js',
      ],
      thresholds: {
        statements: -968,
        branches: -708,
        functions: -243,
        lines: -756,
      },
    },
  },
});
