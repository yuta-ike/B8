/** @type {import('eslint/lib/shared/types').ConfigData} */
const config = {
  root: true,
  extends: ["next/core-web-vitals", "prettier"],
  plugins: ["import", "unused-imports", "@typescript-eslint"],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",
    "import/order": [
      "warn",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
        "newlines-between": "always",
      },
    ],
  },
}

module.exports = config