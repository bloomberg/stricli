// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildCommand } from "@stricli/core";
import packageJson from "../package.json";

const command = buildCommand({
    /* v8 ignore next -- @preserve */
    loader: async () => import("./impl"),
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    brief: "Target path of new package directory",
                    parse(rawInput) {
                        return this.path.join(this.process.cwd(), rawInput);
                    },
                    placeholder: "path",
                },
            ],
        },
        flags: {
            type: {
                kind: "enum",
                brief: "Package type, controls output format of JS files",
                values: ["commonjs", "module"],
                default: "module",
            },
            template: {
                kind: "enum",
                brief: "Application template to generate",
                values: ["single", "multi"],
                default: "multi",
            },
            autoComplete: {
                kind: "boolean",
                brief: "Include auto complete postinstall script",
                default: true,
            },
            name: {
                kind: "parsed",
                brief: "Package name, if different from directory",
                parse: String,
                optional: true,
            },
            command: {
                kind: "parsed",
                brief: "Intended bin command, if different from name",
                parse: String,
                optional: true,
            },
            description: {
                kind: "parsed",
                brief: "Package description",
                parse: String,
                default: "Stricli command line application",
            },
            license: {
                kind: "parsed",
                brief: "Package license",
                parse: String,
                default: "MIT",
            },
            author: {
                kind: "parsed",
                brief: "Package author",
                parse: String,
                default: "",
            },
            nodeVersion: {
                kind: "parsed",
                brief: "Node.js major version to use for engines.node minimum and @types/node, bypasses version discovery logic",
                parse: String,
                optional: true,
                hidden: true,
            },
        },
        aliases: {
            n: "name",
            d: "description",
        },
    },
    docs: {
        brief: packageJson.description,
    },
});

export const app = buildApplication(command, {
    name: packageJson.name,
    versionInfo: {
        currentVersion: packageJson.version,
    },
    scanner: {
        caseStyle: "allow-kebab-for-camel",
    },
    documentation: {
        useAliasInUsageLine: true,
    },
});
