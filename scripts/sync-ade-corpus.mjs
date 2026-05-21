#!/usr/bin/env node
/**
 * Shallow-clone progress/ADE release-12.8.x into corpus/ade (gitignored).
 * CI uses a pinned commit via actions/checkout; this script is for local convenience.
 */
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const root = process.cwd();
const dest = path.join(root, "corpus", "ade");

if (fs.existsSync(path.join(dest, ".git"))) {
  console.log("corpus/ade already exists; remove it to re-clone.");
  process.exit(0);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
execSync(
  `git clone --depth 1 --single-branch --branch release-12.8.x https://github.com/progress/ADE.git "${dest}"`,
  { stdio: "inherit" },
);
console.log(`ADE corpus ready at ${dest}`);
