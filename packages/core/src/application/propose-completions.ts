// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CompletionConfiguration, ScannerConfiguration } from "../config";
import type { CommandContext, StricliDynamicCommandContext } from "../context";
import type { ArgumentCompletion } from "../parameter/scanner";
import { proposeCompletionsForCommand } from "../routing/command/propose-completions";
import { proposeCompletionsForRouteMap } from "../routing/route-map/propose-completions";
import { RouteMapSymbol } from "../routing/route-map/types";
import { buildRouteScanner, type RouteNotFoundError } from "../routing/scanner";
import type { RoutingTarget, RoutingTargetCompletion } from "../routing/types";
import type { ApplicationText } from "../text";
import {
    gatherAdditionalFlagsFromIntegrations,
    proposeCompletionsForAdditionalFlags,
    type StricliIntegration,
} from "./integration";
import type { Application } from "./types";

export type InputCompletion = ArgumentCompletion | RoutingTargetCompletion;

/**
 * Propose possible completions for a partial input string.
 * @deprecated Register `--complete` integration instead.
 */
export async function proposeCompletions<CONTEXT extends CommandContext>(
    { root, config, defaultText, integrations }: Application<CONTEXT>,
    rawInputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
): Promise<readonly InputCompletion[]> {
    if (rawInputs.length === 0) {
        return [];
    }

    const additionalFlags = gatherAdditionalFlagsFromIntegrations(integrations);

    const scanner = buildRouteScanner(root, config.scanner, [], additionalFlags);
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

    if (result.activeFlag) {
        return [];
    }

    let commandContext: CONTEXT;
    if ("forCommand" in context) {
        try {
            commandContext = await context.forCommand({ prefix: result.prefix });
        } catch {
            return [];
        }
    } else {
        commandContext = context;
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const partial = rawInputs[rawInputs.length - 1]!;
    let additionalFlagsForTarget = additionalFlags;
    if (result.target !== root) {
        additionalFlagsForTarget = additionalFlagsForTarget.filter((flag) => flag.global);
    }
    const additionalCompletions = proposeCompletionsForAdditionalFlags(
        additionalFlagsForTarget,
        config.completion,
        config.scanner.caseStyle,
        partial,
    );

    let targetCompletions: readonly InputCompletion[];
    if (result.target.kind === RouteMapSymbol) {
        targetCompletions = await proposeCompletionsForRouteMap(result.target, {
            partial,
            scannerConfig: config.scanner,
            completionConfig: config.completion,
        });
    } else {
        targetCompletions = await proposeCompletionsForCommand(result.target, {
            loadCommandContext: async () => commandContext,
            inputs: result.unprocessedInputs,
            partial,
            scannerConfig: config.scanner,
            completionConfig: config.completion,
            text: defaultText,
        });
    }

    return [...targetCompletions, ...additionalCompletions];
}

/**
 * @internal
 */
export interface ProposeCompletionsForApplicationArguments<CONTEXT extends CommandContext> {
    readonly root: RoutingTarget<CONTEXT>;
    readonly integrations: Readonly<Record<string, StricliIntegration<CONTEXT>>>;
    readonly scannerConfig: ScannerConfiguration;
    readonly completionConfig: CompletionConfiguration;
    readonly text: ApplicationText;
    readonly inputs: readonly string[];
    readonly context: StricliDynamicCommandContext<CONTEXT>;
}

/**
 * Propose possible completions for a partial input string.
 */
export async function proposeCompletionsForApplication<CONTEXT extends CommandContext>({
    root,
    integrations,
    scannerConfig,
    completionConfig,
    text,
    inputs,
    context,
}: ProposeCompletionsForApplicationArguments<CONTEXT>): Promise<readonly InputCompletion[]> {
    if (inputs.length === 0) {
        return [];
    }

    const additionalFlags = gatherAdditionalFlagsFromIntegrations(integrations);

    const scanner = buildRouteScanner(root, scannerConfig, [], additionalFlags);
    const leadingInputs = inputs.slice(0, -1);
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

    if (result.activeFlag) {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const partial = inputs[inputs.length - 1]!;
    let additionalFlagsForTarget = additionalFlags;
    if (result.target !== root) {
        additionalFlagsForTarget = additionalFlagsForTarget.filter((flag) => flag.global);
    }
    const additionalCompletions = proposeCompletionsForAdditionalFlags(
        additionalFlagsForTarget,
        completionConfig,
        scannerConfig.caseStyle,
        partial,
    );

    let targetCompletions: readonly InputCompletion[];
    if (result.target.kind === RouteMapSymbol) {
        targetCompletions = await proposeCompletionsForRouteMap(result.target, {
            partial,
            scannerConfig,
            completionConfig,
        });
    } else {
        targetCompletions = await proposeCompletionsForCommand(result.target, {
            loadCommandContext: async () => {
                if ("forCommand" in context) {
                    return context.forCommand({ prefix: result.prefix });
                } else {
                    return context;
                }
            },
            inputs: result.unprocessedInputs,
            partial,
            scannerConfig,
            completionConfig,
            text,
        });
    }

    return [...targetCompletions, ...additionalCompletions];
}
