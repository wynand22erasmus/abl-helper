/** ESLint flat config: TypeScript in src/ and scripts/; no hand-written JS under those trees. */
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const jsForbiddenMessage =
  "JavaScript source files are not allowed. Use TypeScript (.ts) instead.";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["out/**", "node_modules/**", "corpus/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["src/**/*.{js,jsx}", "scripts/**/*.{js,jsx,mjs}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "Program",
          message: jsForbiddenMessage,
        },
      ],
    },
  },
);
