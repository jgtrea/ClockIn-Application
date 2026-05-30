import globals from "globals";

export default [
  {
    ignores: ["node_modules/**"]
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        supabaseClient: "readonly",
        bootstrap: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "eqeqeq": "warn"
    }
  }
];
