import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const DIST_ASSETS = path.resolve("dist/assets");
const MAX_JS_BYTES = 250 * 1024;

const entries = await readdir(DIST_ASSETS, { withFileTypes: true });
const jsFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".js"));

if (!jsFiles.length) {
  throw new Error("Bundle size check found no JavaScript assets in dist/assets.");
}

const sizes = await Promise.all(
  jsFiles.map(async (entry) => ({
    name: entry.name,
    bytes: (await stat(path.join(DIST_ASSETS, entry.name))).size,
  })),
);

const oversized = sizes.filter(({ bytes }) => bytes > MAX_JS_BYTES);
const largest = [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 5);

console.log("Largest JavaScript bundles:");
for (const { name, bytes } of largest) {
  console.log(`  ${name}: ${(bytes / 1024).toFixed(1)} KiB`);
}

if (oversized.length) {
  console.error(`Bundle size budget exceeded (${MAX_JS_BYTES / 1024} KiB per JavaScript file):`);
  for (const { name, bytes } of oversized) {
    console.error(`  ${name}: ${(bytes / 1024).toFixed(1)} KiB`);
  }
  process.exit(1);
}
