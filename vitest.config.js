import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.spec.js'],
    coverage: {
      provider: "v8",
      reporter: ["text"],
      clean: false,
      reportOnFailure: true,
      include: ['lib/**/*.js'],
      exclude: [
        '_lib',
        'lib/**/index.*',
        'lib/**/__tests__/**',
        'lib/**/*.spec.js',
      ],
      thresholds: {
        statements: 87,
        branches: 83,
        functions: 80,
        lines: 87,
      },
    },
  },
});
