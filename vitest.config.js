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
        statements: -966,
        branches: -706,
        functions: -242,
        lines: -755,
      },
    },
  },
});
