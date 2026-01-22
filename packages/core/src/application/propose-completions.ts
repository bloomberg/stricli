// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext, StricliDynamicCommandContext } from "../context";
import type { ArgumentCompletion } from "../parameter/scanner";
import { proposeCompletionsForCommand } from "../routing/command/propose-completions";
import { proposeCompletionsForRouteMap } from "../routing/route-map/propose-completions";
import { RouteMapSymbol } from "../routing/route-map/types";
import { buildRouteScanner, type RouteNotFoundError } from "../routing/scanner";
import type { RoutingTargetCompletion } from "../routing/types";
import type { Application } from "./types";

export type InputCompletion = ArgumentCompletion | RoutingTargetCompletion;

/**
 * Propose possible completions for a partial input string.
 */
export async function proposeCompletionsForApplication<CONTEXT extends CommandContext>(
    { root, config, defaultText }: Application<CONTEXT>,
    rawInputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
): Promise<readonly InputCompletion[]> {
    if (rawInputs.length === 0) {
        return [];
    }

    const scanner = buildRouteScanner(root, config.scanner, []);
    const leadingInputs = rawInputs.slice(0, -1);
    let error: RouteNotFoundError<CONTEXT> | undefined;
    while (leadingInputs.length > 0 && !error) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const input = leadingInputs.shift()!;
        error = scanner.next(input);
    }
    if (error) {
        return [];
    }
    const result = scanner.finish();

    if (result.helpRequested) {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const partial = rawInputs[rawInputs.length - 1]!;
    if (result.target.kind === RouteMapSymbol) {
        return proposeCompletionsForRouteMap(result.target, {
            partial,
            scannerConfig: config.scanner,
            completionConfig: config.completion,
        });
    }

    return proposeCompletionsForCommand(result.target, {
        loadCommandContext: async () => {
            if ("forCommand" in context) {
                return context.forCommand({ prefix: result.prefix });
            } else {
                return context;
            }
        },
        inputs: result.unprocessedInputs,
        partial,
        scannerConfig: config.scanner,
        completionConfig: config.completion,
        text: defaultText,
        includeVersionFlag: Boolean(config.versionInfo) && result.rootLevel,
    });
}
