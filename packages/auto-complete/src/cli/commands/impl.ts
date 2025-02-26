// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import shells from "../../shells";
import type { Shell } from "../../types";
import type { StricliAutoCompleteContext } from "../context";
import type { ActiveShells, ShellAutoCompleteCommands } from "./spec";

export type InstallAllFlags = {
    readonly autocompleteCommand: string;
    readonly skipInactiveShells: boolean;
};

export async function installAll(
    this: StricliAutoCompleteContext,
    flags: InstallAllFlags,
    targetCommand: string,
): Promise<void> {
    for (const [shell, support] of Object.entries(shells)) {
        if (flags.skipInactiveShells && !(await support.isShellActive(this))) {
            this.process.stdout.write(`Skipping ${shell} as it is not active\n`);
            continue;
        }
        const shellManager = await support.getCommandManager(this);
        const message = await shellManager.install(targetCommand, `${flags.autocompleteCommand} ${shell}`);
        this.process.stdout.write(`Installed autocomplete support for ${targetCommand} in ${shell}\n`);
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}

export type UninstallAllFlags = {
    readonly skipInactiveShells: boolean;
};

export async function uninstallAll(
    this: StricliAutoCompleteContext,
    flags: UninstallAllFlags,
    targetCommand: string,
): Promise<void> {
    for (const [shell, support] of Object.entries(shells)) {
        if (flags.skipInactiveShells && !(await support.isShellActive(this))) {
            this.process.stdout.write(`Skipping ${shell} as it is not active\n`);
            continue;
        }
        const shellManager = await support.getCommandManager(this);
        const message = await shellManager.uninstall(targetCommand);
        this.process.stdout.write(`Installed autocomplete support for ${targetCommand} in ${shell}\n`);
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}

export async function install(
    this: StricliAutoCompleteContext,
    flags: ShellAutoCompleteCommands,
    targetCommand: string,
): Promise<void> {
    for (const [shell, autocompleteCommand] of Object.entries(flags)) {
        const shellManager = await shells[shell as Shell].getCommandManager(this);
        const message = await shellManager.install(targetCommand, autocompleteCommand);
        this.process.stdout.write(`Installed autocomplete support for ${targetCommand} in ${shell}\n`);
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}

export async function uninstall(
    this: StricliAutoCompleteContext,
    flags: ActiveShells,
    targetCommand: string,
): Promise<void> {
    const activeShells = Object.entries(flags)
        .filter(([, active]) => active)
        .map(([shell]) => shell as Shell);
    for (const shell of activeShells) {
        const shellManager = await shells[shell].getCommandManager(this);
        const message = await shellManager.uninstall(targetCommand);
        this.process.stdout.write(`Uninstalled autocomplete support for ${targetCommand} in ${shell}\n`);
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}
