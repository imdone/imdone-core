import { build } from "esbuild";
import { readFile, writeFile, stat, chmod } from "fs/promises";

// Read dependencies from package.json
const packageJson = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const externalDeps = Object.keys(packageJson.dependencies || {});

async function getFileSize(filePath) {
  const stats = await stat(filePath);
  return (stats.size / 1024).toFixed(2); // Convert bytes to kilobytes and format to 2 decimal places
}

await Promise.all([
  build({
    entryPoints: ["lib/index.js"], // Main library entry point
    bundle: true,
    format: "esm",
    platform: "node",
    sourcemap: false,
    external: externalDeps,
    outdir: "dist",
  }).then(async () => {
    const size = await getFileSize("dist/index.js");
    console.log(`✅ Main library bundle size: ${size} KB`);
  }),
  build({
    entryPoints: ["lib/cli.js"], // CLI entry point
    bundle: true,
    format: "esm", // Use CommonJS format for CLI
    platform: "node",
    sourcemap: false,
    external: [...externalDeps], // Add Node.js built-in modules to external dependencies
    outfile: "dist/cli.js",
    loader: {
      ".js": "js",
      ".json": "json"
    },  // ✅ Tell esbuild to handle JSON files
  }).then(async () => {
    // Restore the shebang after bundling
    const cliPath = "dist/cli.js";
    let content = await readFile(cliPath, "utf8");
    if (!content.startsWith('#!/usr/bin/env node')) {
      content = `#!/usr/bin/env node\n${content}`;
      await writeFile(cliPath, content);
      console.log("✅ Shebang restored in CLI build");
    }

    // Give the CLI script executable permissions
    await chmod(cliPath, 0o755);
    console.log("✅ Executable permissions set for CLI build");

    const size = await getFileSize(cliPath);
    console.log(`✅ CLI bundle size: ${size} KB`);
  }),
]);

console.log("✅ Build successful");
