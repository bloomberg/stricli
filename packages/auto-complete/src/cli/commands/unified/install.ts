// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { shells } from "../../../shells";
import type { StricliAutoCompleteContext } from "../../context";

export type Flags = {
    readonly autocompleteCommand: string;
    readonly onlyActiveShells: boolean;
};

export default async function (this: StricliAutoCompleteContext, flags: Flags, targetCommand: string): Promise<void> {
    for (const [shell, support] of Object.entries(shells)) {
        if (flags.onlyActiveShells && !(await support.isShellActive(this))) {
            this.process.stdout.write(`Skipping ${shell} as it is not active.\n`);
            continue;
        }
        const shellManager = await support.getCommandManager(this);
        const message = await shellManager.install(targetCommand, `${flags.autocompleteCommand} ${shell}`);
        this.process.stdout.write(`Installed autocomplete support for ${targetCommand} in ${shell}.\n`);
        /* v8 ignore else -- @preserve */
        if (message) {
            this.process.stdout.write(`${message}\n`);
        }
    }
}
