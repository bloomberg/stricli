// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildCommand, type Command, type TypedPositionalParameter } from "@stricli/core";
import type { StricliAutoCompleteContext } from "./context";
import type { ActiveShells, ShellAutoCompleteCommands } from "./impl";
import { joinWithGrammar } from "./formatting";

const targetCommandParameter: TypedPositionalParameter<string> = {
    parse: String,
    brief: "Target command run by user",
    placeholder: "targetCommand",
};

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
            fish: {
                kind: "parsed",
                brief: "Command executed by fish to generate completion proposals",
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
        brief: "Installs autocomplete support for target command on all provided shell types",
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
            brief: `Installs ${shellsText} autocomplete support for ${targetCommand}`,
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
            fish: {
                kind: "boolean",
                brief: "Uninstall autocompletion for fish",
                optional: true,
            },
        },
        positional: {
            kind: "tuple",
            parameters: [targetCommandParameter],
        },
    },
    docs: {
        brief: "Uninstalls autocomplete support for target command on all selected shell types",
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
            brief: `Uninstalls ${shellsText} autocomplete support for ${targetCommand}`,
        },
    });
}
