import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import header from "eslint-plugin-header";
import _import from "eslint-plugin-import";
import ts from "typescript-eslint";

export default [
    js.configs.recommended,
    ...ts.configs.strict,
    {
        plugins: {
            header,
            import: fixupPluginRules(_import),
        },

        linterOptions: {
            reportUnusedDisableDirectives: true,
        },

        languageOptions: {
            parser: tsParser,
        },

        rules: {
            "header/header": [
                "error",
                "line",
                " Copyright 2024 Bloomberg Finance L.P.\n Distributed under the terms of the Apache 2.0 license.",
                0,
            ],

            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["**/index"],
                            message: "Internal library code should never import from library root.",
                        },
                    ],
                },
            ],

            "import/no-extraneous-dependencies": [
                "error",
                {
                    devDependencies: false,
                },
            ],

            "@typescript-eslint/no-import-type-side-effects": "error",

            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                },
            ],

            "@typescript-eslint/consistent-type-definitions": "off",
            "@typescript-eslint/no-unnecessary-type-arguments": "off",
            "@typescript-eslint/no-invalid-void-type": "off",
            "@typescript-eslint/require-await": "off",
        },
    },
    {
        files: ["tests/**/*.ts"],

        languageOptions: {
            parserOptions: {
                parserService: true,
            },
        },

        rules: {
            "no-restricted-imports": [
                "error",
                {
                    patterns: [
                        {
                            group: ["**/src/*"],
                            message:
                                "Tests should always import from library root, except when testing internal-only code.",
                        },
                    ],
                },
            ],

            "import/no-extraneous-dependencies": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
];
