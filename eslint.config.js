import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";

// Vor allem gegen Fehler, die der Build nicht findet: nicht deklarierte Namen,
// Tippfehler in Variablen, doppelte Schlüssel.
export default [
  { ignores: ["dist/", "node_modules/"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      // catch{} ohne Inhalt ist hier bewusst: "Fehler ignorieren, weitermachen"
      "no-empty": ["error", { allowEmptyCatch: true }],
      // ({cfg, ...rest}) = cfg bewusst weglassen
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["scripts/**/*.js", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
];
