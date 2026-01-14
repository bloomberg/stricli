// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildCommand, type Command, type TypedPositionalParameter } from "@stricli/core";
import { joinWithGrammar } from "../../util/formatting";
import type { Shell } from "../../types";
import type { StricliAutoCompleteContext } from "../context";
import type { InstallAllFlags, UninstallAllFlags } from "./impl";

export type ShellAutoCompleteCommands = Readonly<Partial<Record<Shell, string>>>;

export type ActiveShells = Readonly<Partial<Record<Shell, boolean>>>;

const targetCommandParameter: TypedPositionalParameter<string> = {
    parse: String,
    brief: "Target command run by user, typically the application name",
    placeholder: "targetCommand",
};

export const installAllCommand = buildCommand({
    loader: async () => {
        const { installAll } = await import("./impl");
        return installAll;
    },
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
        brief: "Installs autocomplete support for target command on all shell types.",
    },
});

export function buildInstallAllCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    flags: InstallAllFlags,
): Command<CONTEXT> {
    return buildCommand({
        loader: async () => {
            const { installAll } = await import("./impl");
            return function () {
                return installAll.call(this, flags, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Installs autocomplete support for ${targetCommand} on all shell types.`,
        },
    });
}

export const uninstallAllCommand = buildCommand({
    loader: async () => {
        const { uninstallAll } = await import("./impl");
        return uninstallAll;
    },
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
        brief: "Uninstalls autocomplete support for target command on all shell types.",
    },
});

export function buildUninstallAllCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    flags: UninstallAllFlags,
): Command<CONTEXT> {
    return buildCommand({
        loader: async () => {
            const { uninstallAll } = await import("./impl");
            return function () {
                return uninstallAll.call(this, flags, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Uninstalls autocomplete support for ${targetCommand} on all shell types.`,
        },
    });
}

export const installCommand = buildCommand({
    loader: async () => {
        const { install } = await import("./impl");
        return install;
    },
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
        brief: "Installs autocomplete support for target command on all provided shell types.",
    },
});

export function buildInstallCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    commands: ShellAutoCompleteCommands,
): Command<CONTEXT> {
    const shellsText = joinWithGrammar(Object.keys(commands), { conjunction: "and", serialComma: true });
    return buildCommand({
        loader: async () => {
            const { install } = await import("./impl");
            return function () {
                return install.call(this, commands, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Installs ${shellsText} autocomplete support for ${targetCommand}.`,
        },
    });
}

export const uninstallCommand = buildCommand({
    loader: async () => {
        const { uninstall } = await import("./impl");
        return uninstall;
    },
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
        brief: "Uninstalls autocomplete support for target command on all selected shell types.",
    },
});

export function buildUninstallCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    shells: ActiveShells,
): Command<CONTEXT> {
    const activeShells = Object.entries(shells)
        .filter(([, enabled]) => enabled)
        .map(([shell]) => shell);
    const shellsText = joinWithGrammar(activeShells, { conjunction: "and", serialComma: true });
    return buildCommand({
        loader: async () => {
            const { uninstall } = await import("./impl");
            return function () {
                return uninstall.call(this, shells, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Uninstalls ${shellsText} autocomplete support for ${targetCommand}.`,
        },
    });
}
