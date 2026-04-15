const globals = require("globals");
const js = require("@eslint/js");
const jestPlugin = require("eslint-plugin-jest");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    plugins: {
      jest: jestPlugin,
    },
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
      "no-undef": "warn",
    },
  },
];
