import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.spec.js'], // Only look for test files inside src/
    coverage: {
      provider: "v8", // or "istanbul" if using @vitest/coverage-istanbul
      reporter: ["text"], // Ensure text output is included
      clean: false,
      reportOnFailure: true,
    },
  },
});
