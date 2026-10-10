#!/usr/bin/env node
/**
 * generate-icons.mjs — npm entry point for app icon generation.
 *
 * Delegates to the dependency-free Python rasterizer (`generate_icons.py`),
 * which draws the prism logo from public/icon.svg's design and writes
 * PNG + multi-size ICO into src-tauri/icons/.
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src-tauri", "icons");
const py = join(root, "scripts", "generate_icons.py");

console.log("Rendering Diffract icons…");
execSync(`python3 "${py}"`, { stdio: "inherit", cwd: root });

if (!existsSync(join(outDir, "icon.ico"))) {
  console.error("icon.ico missing — Tauri bundling will fail on Windows.");
  process.exit(1);
}
