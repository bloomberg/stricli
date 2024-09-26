// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { ScannerConfiguration } from "../../config";
import type { CommandContext } from "../../context";
import {
    buildArgumentScanner,
    type ArgumentCompletion,
    type ArgumentScannerCompletionArguments,
} from "../../parameter/scanner";
import type { Command } from "./types";

export interface CommandProposeCompletionsArguments<CONTEXT extends CommandContext>
    extends ArgumentScannerCompletionArguments<CONTEXT> {
    readonly inputs: readonly string[];
    readonly scannerConfig: ScannerConfiguration;
}

export async function proposeCompletionsForCommand<CONTEXT extends CommandContext>(
    { parameters }: Command<CONTEXT>,
    args: CommandProposeCompletionsArguments<CONTEXT>,
): Promise<readonly ArgumentCompletion[]> {
    try {
        const scanner = buildArgumentScanner(parameters, args.scannerConfig);
        for (const input of args.inputs) {
            scanner.next(input);
        }
        return await scanner.proposeCompletions(args);
    } catch {
        return [];
    }
}
