// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { shells, type Shell } from "../../shells";
import type { StricliAutoCompleteContext } from "../context";
import type { ShellAutoCompleteCommands } from "../spec";

export default async function (
    this: StricliAutoCompleteContext,
    flags: ShellAutoCompleteCommands,
    targetCommand: string,
): Promise<void> {
    for (const [shell, autocompleteCommand] of Object.entries(flags)) {
        const shellManager = await shells[shell as Shell].getCommandManager(this);
        const message = await shellManager.install(targetCommand, autocompleteCommand);
        this.process.stdout.write(`Installed autocomplete support for ${targetCommand} in ${shell}.\n`);
        /* v8 ignore else -- @preserve */
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}
