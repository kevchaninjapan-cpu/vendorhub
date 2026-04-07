/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@profile/*"],
            message: "Invalid alias. Use @/… (mapped to src/) instead.",
          },
        ],
      },
    ],
  },
};