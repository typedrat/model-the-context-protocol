import { defineConfig } from "eslint/config";

import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import * as tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,

  // @ts-expect-error ESLint configs use weird typing, part 1
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },

  // @ts-expect-error ESLint configs use weird typing, part 2
  importX.flatConfigs.recommended,
  // @ts-expect-error ESLint configs use weird typing, part 3
  importX.flatConfigs.typescript,
  {
    files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "import-x/no-dynamic-require": "warn",
    },
    settings: {
      "import-x/resolver-next": [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          bun: true,
        }),
      ],
    },
  },

  stylistic.configs.customize({
    quotes: "double",
    semi: true,
  }),

  unicorn.configs.recommended,
]);
