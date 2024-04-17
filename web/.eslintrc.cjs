module.exports = {
    root: true,
    env: { browser: true },
    ignorePatterns: ["dist", ".eslintrc.cjs"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: [ "./tsconfig.json" ],
        tsconfigRootDir: __dirname,
    },
    plugins: [
        "@stylistic",
        "react-refresh",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/strict-type-checked",
        "plugin:@typescript-eslint/stylistic-type-checked",
        "plugin:react-hooks/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react/recommended",
    ],
    rules: {
        "@stylistic/quotes": [ "error", "double", { "avoidEscape": true } ],
        "@typescript-eslint/consistent-type-definitions": ["error", "type"],
        "@typescript-eslint/no-confusing-void-expression": "off",
        "@typescript-eslint/no-floating-promises": "off",
        "@typescript-eslint/no-misused-promises": "off",
        "@typescript-eslint/prefer-nullish-coalescing": [ "error", { "ignoreConditionalTests": true } ],
        "@typescript-eslint/restrict-template-expressions": "off",
        "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
        "react-hooks/exhaustive-deps": "off",
        "react/no-unescaped-entities": "off",
        "react/prop-types": "off",
        "react/react-in-jsx-scope": "off",
    },
    settings: {
        react: {
            version: "detect"
        }
    },
};
