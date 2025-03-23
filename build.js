import { build } from "esbuild";
import { readFile } from "fs/promises";

// Read dependencies from package.json
const packageJson = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const externalDeps = Object.keys(packageJson.dependencies || {});

await build({
  entryPoints: ["lib/index.js"], // Change this if needed
  bundle: true,
  format: "esm", // Output ESM format
  platform: "node", // Target Node.js environment
  sourcemap: false, // Optional, for debugging
  external: externalDeps, // Exclude npm dependencies
  outdir: "dist", // Output directory
});

console.log("✅ Build successful");
