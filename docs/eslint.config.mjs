import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import a11y from "eslint-plugin-jsx-a11y";
import ts from "typescript-eslint";
import common from "../eslint.config.mjs";

export default [
    ...ts.configs.strictTypeChecked,
    ...common,
    {
        ...react.configs.flat.recommended,
        settings: {
            react: {
                version: "detect",
            },
        },
    },
    react.configs.flat["jsx-runtime"],
    hooks.configs.flat.recommended,
    a11y.flatConfigs.recommended,
    a11y.flatConfigs.strict,
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
