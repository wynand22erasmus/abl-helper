import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    testTimeout: 120000,
  },
  resolve: {
    alias: {
      vscode: path.resolve(rootDir, "src/test/vscode-stub.ts"),
    },
  },
});
