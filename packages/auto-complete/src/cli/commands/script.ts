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
        const script = shells[shell as Shell].generateScript(targetCommand, autocompleteCommand);
        this.process.stdout.write(`${script}\n`);
    }
}
