// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildCommand, type TypedPositionalParameter } from "@stricli/core";
import type { Shell } from "../shells";

export type ShellAutoCompleteCommands = Readonly<Partial<Record<Shell, string>>>;

export type ActiveShells = Readonly<Partial<Record<Shell, boolean>>>;

const targetCommandParameter: TypedPositionalParameter<string> = {
    parse: String,
    brief: "Target command run by user, typically the application name",
    placeholder: "targetCommand",
};

export const installCommand = buildCommand({
    loader: async () => import("./commands/install"),
    parameters: {
        flags: {
            bash: {
                kind: "parsed",
                brief: "Command executed by bash to generate completion proposals",
                parse: String,
                optional: true,
                placeholder: "command",
            },
        },
        positional: {
            kind: "tuple",
            parameters: [targetCommandParameter],
        },
    },
    docs: {
        brief: "Installs autocomplete support for target command on all provided shells.",
    },
});

export const unifiedInstallCommand = buildCommand({
    loader: async () => import("./commands/unified/install"),
    parameters: {
        flags: {
            autocompleteCommand: {
                kind: "parsed",
                brief: "Command to generate completion proposals, first argument is shell type",
                parse: String,
                placeholder: "command",
            },
            onlyActiveShells: {
                kind: "boolean",
                brief: "Skip installing for inactive shell(s)",
                default: true,
            },
        },
        positional: {
            kind: "tuple",
            parameters: [targetCommandParameter],
        },
    },
    docs: {
        brief: "Installs autocomplete support for target command on all supported shells.",
    },
});

export const uninstallCommand = buildCommand({
    loader: async () => import("./commands/uninstall"),
    parameters: {
        flags: {
            bash: {
                kind: "boolean",
                brief: "Uninstall autocompletion for bash",
                optional: true,
            },
        },
        positional: {
            kind: "tuple",
            parameters: [targetCommandParameter],
        },
    },
    docs: {
        brief: "Uninstalls autocomplete support for target command on all selected shells.",
    },
});

export const unifiedUninstallCommand = buildCommand({
    loader: async () => import("./commands/unified/uninstall"),
    parameters: {
        flags: {
            onlyActiveShells: {
                kind: "boolean",
                brief: "Skip installing for inactive shell(s)",
                default: true,
            },
        },
        positional: {
            kind: "tuple",
            parameters: [targetCommandParameter],
        },
    },
    docs: {
        brief: "Uninstalls autocomplete support for target command on all supported shells.",
    },
});
