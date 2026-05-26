export default [
  {
    ignores: ["node_modules/**"]
  },
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        supabaseClient: "readonly",
        bootstrap: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "error",
      "no-console": "off",
      "no-undef": "error",
      "eqeqeq": "error"
    }
  }
];
