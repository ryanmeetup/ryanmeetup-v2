import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        fetch: "readonly",
        process: "readonly",
      },
    },
  },
  { ignores: ["dist/**"] },
);
