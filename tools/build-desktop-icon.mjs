import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "assets", "logo.svg");
const outputDirectory = path.join(root, "desktop", "assets");
const output = path.join(outputDirectory, "icon.png");

await fs.mkdir(outputDirectory, { recursive: true });
await sharp(source).resize(512, 512).png().toFile(output);
console.log(`Windows-Symbol erzeugt: ${output}`);
