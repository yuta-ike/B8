/** @type {import('prettier').Config} */
const config = {
  semi: false,
  arrowParens: "always",
  printWidth: 100,
  plugins: ["prettier-plugin-tailwindcss"],
  tailwindFunctions: ["clsx"],
}

module.exports = config