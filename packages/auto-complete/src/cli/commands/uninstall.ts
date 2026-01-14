// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { shells, type Shell } from "../../shells";
import type { StricliAutoCompleteContext } from "../context";
import type { ActiveShells } from "../spec";

export default async function (
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
        this.process.stdout.write(`Uninstalled autocomplete support for ${targetCommand} in ${shell}.\n`);
        /* v8 ignore else -- @preserve */
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}
