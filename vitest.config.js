import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.{js,ts,jsx,tsx}'], // Only look for test files inside src/
    coverage: {
      provider: "v8", // or "istanbul" if using @vitest/coverage-istanbul
      reporter: ["text", "lcov"], // Ensure text output is included
    },
  },
});
