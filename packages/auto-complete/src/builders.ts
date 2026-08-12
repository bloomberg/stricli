// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildCommand, buildRouteMap, type Command, type RouteMap } from "@stricli/core";
import { joinWithGrammar } from "./util/formatting";
import type { StricliAutoCompleteContext } from "./cli/context";
import type { Flags as UnifiedUninstallFlags } from "./cli/commands/unified/uninstall";
import type { Flags as UnifiedInstallFlags } from "./cli/commands/unified/install";
import type { ShellAutoCompleteCommands, ActiveShells } from "./cli/spec";
import { shells, type Shell } from "./shells";

export function buildScriptCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    commands: ShellAutoCompleteCommands,
): Command<CONTEXT> {
    const shellsText = joinWithGrammar(Object.keys(commands), { conjunction: "and", serialComma: true });
    return buildCommand({
        loader: async () => {
            const { default: install } = await import("./cli/commands/install");
            return function (this: CONTEXT, { shell }: { shell: Shell }) {
                return install.call(this, { [shell]: commands[shell] }, targetCommand);
            };
        },
        parameters: {
            flags: {
                shell: {
                    kind: "enum",
                    values: Object.keys(commands) as Shell[],
                    brief: "Shell to generate script for",
                    placeholder: "shell",
                },
            },
        },
        docs: {
            brief: `Prints the script for ${shellsText} autocomplete support to stdout.`,
        },
    });
}

export function buildInstallCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    commands: ShellAutoCompleteCommands,
): Command<CONTEXT> {
    const shellsText = joinWithGrammar(Object.keys(commands), { conjunction: "and", serialComma: true });
    return buildCommand({
        loader: async () => {
            const { default: install } = await import("./cli/commands/install");
            return function (this: CONTEXT) {
                return install.call(this, commands, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Installs ${shellsText} autocomplete support for ${targetCommand}.`,
        },
    });
}

export function buildUnifiedInstallCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    flags: UnifiedInstallFlags,
): Command<CONTEXT> {
    return buildCommand({
        loader: async () => {
            const { default: install } = await import("./cli/commands/unified/install");
            return function (this: CONTEXT) {
                return install.call(this, flags, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Installs autocomplete support for ${targetCommand} on all active shells.`,
        },
    });
}

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
            const { default: uninstall } = await import("./cli/commands/uninstall");
            return function (this: CONTEXT) {
                return uninstall.call(this, shells, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Uninstalls ${shellsText} autocomplete support for ${targetCommand}.`,
        },
    });
}

export function buildUnifiedUninstallCommand<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    flags: UnifiedUninstallFlags,
): Command<CONTEXT> {
    return buildCommand({
        loader: async () => {
            const { default: uninstall } = await import("./cli/commands/unified/uninstall");
            return function (this: CONTEXT) {
                return uninstall.call(this, flags, targetCommand);
            };
        },
        parameters: {},
        docs: {
            brief: `Uninstalls autocomplete support for ${targetCommand} on all active shells.`,
        },
    });
}

export function buildAutocompleteRouteMap<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    commands: ShellAutoCompleteCommands,
): RouteMap<CONTEXT> {
    const shells = Object.keys(commands);
    const shellsText = joinWithGrammar(shells, { conjunction: "and", serialComma: true });
    return buildRouteMap({
        routes: {
            script: buildScriptCommand(targetCommand, commands),
            install: buildInstallCommand(targetCommand, commands),
            uninstall: buildUninstallCommand(targetCommand, Object.fromEntries(shells.map((shell) => [shell, true]))),
        },
        docs: {
            brief: `Manage ${shellsText} autocomplete support for ${targetCommand}.`,
        },
    });
}

export function buildUnifiedAutocompleteRouteMap<CONTEXT extends StricliAutoCompleteContext>(
    targetCommand: string,
    flags: UnifiedInstallFlags,
): RouteMap<CONTEXT> {
    const commands = Object.fromEntries(Object.keys(shells).map((shell) => [shell as Shell, flags.autocompleteCommand])) as ShellAutoCompleteCommands;
    return buildRouteMap({
        routes: {
            script: buildScriptCommand(targetCommand, commands),
            install: buildUnifiedInstallCommand(targetCommand, flags),
            uninstall: buildUnifiedUninstallCommand(targetCommand, flags),
        },
        docs: {
            brief: `Manage autocomplete support for ${targetCommand} on all active shells.`,
        },
    });
}
