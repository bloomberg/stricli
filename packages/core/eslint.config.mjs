import common from "../../eslint.config.mjs";
import ts from "typescript-eslint";

export default [
    ...ts.configs.strictTypeChecked,
    ...common,
    {
        languageOptions: {
            parserOptions: {
                project: ["src/tsconfig.json"],
            },
        },
    },
    {
        files: ["tests/**/*.ts"],
        languageOptions: {
            parserOptions: {
                project: ["tsconfig.json"],
            },
        },
    },
];
