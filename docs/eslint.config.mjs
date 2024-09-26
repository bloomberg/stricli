import ts from "typescript-eslint";
import common from "../eslint.config.mjs";

export default [
    ...ts.configs.strictTypeChecked,
    ...common,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },

        rules: {
            "@typescript-eslint/no-unnecessary-condition": "off",
        },
    },
];
