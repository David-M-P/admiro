import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Add these rules to your configuration
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "off", // Disable the base ESLint unused vars rule
      "@typescript-eslint/no-unused-vars": "warn", // Enable TypeScript-specific unused vars rule with warning level
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
];
