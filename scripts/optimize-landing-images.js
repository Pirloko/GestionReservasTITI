#!/usr/bin/env node
/**
 * Genera versiones WebP optimizadas (máx. 800px) para la landing.
 * Requiere: npx sharp-cli
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "mockup", "assets");
const images = fs
  .readdirSync(assetsDir)
  .filter((name) => /\.(jpe?g|png)$/i.test(name) && !name.includes("castillo-inflable"));

for (const name of images) {
  const base = name.replace(/\.(jpe?g|png)$/i, "");
  const input = path.join(assetsDir, name);
  const output = path.join(assetsDir, `${base}.webp`);
  const isLogo = /logo/i.test(name);
  const size = isLogo ? 192 : 800;
  const quality = isLogo ? 85 : 78;

  execFileSync(
    "npx",
    [
      "--yes",
      "sharp-cli",
      "-i",
      input,
      "-o",
      output,
      "resize",
      String(size),
      String(size),
      "--fit",
      "inside",
      "--withoutEnlargement",
      "-f",
      "webp",
      "-q",
      String(quality),
    ],
    { stdio: "inherit" }
  );
}

console.log("WebP generados en mockup/assets/");
