import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    testTimeout: 120000,
  },
  resolve: {
    alias: {
      "vscode": path.resolve(__dirname, "src/test/vscode-stub.ts"),
    },
  },
});
