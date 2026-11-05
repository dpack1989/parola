import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(projectRoot, "www");
const sources = ["index.html", "manifest.webmanifest", "sw.js", "css", "js", "assets", "data"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const source of sources) {
  await cp(join(projectRoot, source), join(output, source), { recursive: true });
}

console.log(`Native Web-Dateien wurden nach ${output} kopiert.`);
