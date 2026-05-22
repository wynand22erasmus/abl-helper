import { fileURLToPath } from "node:url";
import * as path from "node:path";

/** Directory containing the calling module (ESM-safe replacement for `__dirname`). */
export function moduleDir(importMetaUrl: string): string {
  return path.dirname(fileURLToPath(importMetaUrl));
}
