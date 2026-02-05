import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,

  // Add these rules to your configuration
  {
    rules: {
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": "off", // Disable the base ESLint unused vars rule
      "@typescript-eslint/no-unused-vars": "warn", // Enable TypeScript-specific unused vars rule with warning level
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
];