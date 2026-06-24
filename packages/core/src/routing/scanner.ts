// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DisplayCaseStyle, ScannerConfiguration } from "../config";
import type { CommandContext } from "../context";
import type { AdditionalFlagDocumentation } from "../parameter/flag/formatting";
import { findFlagsByArgument, resolveAliases } from "../parameter/scanner";
import type { AvailableAlias } from "../parameter/types";
import { convertKebabCaseToCamelCase } from "../util/case-style";
import { CommandSymbol } from "./command/types";
import { RouteMapSymbol, type RouteMap } from "./route-map/types";
import type { RoutingTarget } from "./types";

/**
 * The result of scanning the inputs in order to find the correct target that was indicated.
 */
export type RouteScanResult<CONTEXT extends CommandContext> = {
    /**
     * The target that was found by the scanner for the given inputs.
     * This will be either a command or a route map, depending on the inputs and the structure of the application.
     */
    readonly target: RoutingTarget<CONTEXT>;
    /**
     * These are inputs that were not processed by the scanner, either because a route was already found or because they were otherwise irrelevant to the scanning process.
     * They have not been parsed or processed in any way, and are provided as-is for the caller to handle.
     *
     * When a command is targeted, these inputs will be processed by the command's argument scanner.
     */
    readonly unprocessedInputs: readonly string[];
    /**
     * The exact set of inputs that were used to reach the target, in the order they were provided.
     * This may include command aliases and is not always the "canonical" route to the target.
     */
    readonly prefix: readonly string[];
    /**
     * The other aliases for the route that was found, if any.
     * Does not include intermediate aliases for route maps that were traversed to reach the target.
     *
     * Results for each case style are provided, and the caller can choose which case style to use for display purposes.
     */
    readonly aliases: Readonly<Record<DisplayCaseStyle, readonly string[]>>;
};

/**
 * An additional flag that may be included with a command or route map.
 * Currently, these are only provided by integrations.
 */
export type AdditionalFlag = AdditionalFlagDocumentation & {
    /**
     * When `true`, this flag will be added to all commands and route maps in the application.
     * Otherwise, it will only be added to the root command or route map.
     */
    readonly global?: boolean;
    /**
     * When `true`, this flag will be included in completion proposals, if the partial input matches the flag or alias.
     */
    readonly complete?: boolean;
};

/**
 * @internal
 */
export type InternalRouteScanResult<
    FLAG extends AdditionalFlag,
    CONTEXT extends CommandContext,
> = RouteScanResult<CONTEXT> & {
    readonly activeFlag?: FLAG;
};

/**
 * @internal
 */
export interface RouteNotFoundError<CONTEXT extends CommandContext> {
    readonly input: string;
    readonly routeMap: RouteMap<CONTEXT>;
}

/**
 * @internal
 */
export interface RouteScanner<FLAG extends AdditionalFlag, CONTEXT extends CommandContext> {
    readonly next: (input: string) => RouteNotFoundError<CONTEXT> | undefined;
    readonly finish: () => InternalRouteScanResult<FLAG, CONTEXT>;
}

/**
 * @internal
 */
export function buildRouteScanner<FLAG extends AdditionalFlag, CONTEXT extends CommandContext>(
    root: RoutingTarget<CONTEXT>,
    config: ScannerConfiguration,
    startingPrefix: readonly string[],
    additionalFlags: readonly FLAG[],
): RouteScanner<FLAG, CONTEXT> {
    const prefix = [...startingPrefix];
    const unprocessedInputs: string[] = [];

    const flags: Record<string, FLAG> = {};
    for (const additionalFlag of additionalFlags) {
        flags[additionalFlag.name] = additionalFlag;
    }

    const aliases: Partial<Record<AvailableAlias, string>> = {};
    for (const additionalFlag of additionalFlags) {
        if (additionalFlag.aliases) {
            for (const alias of additionalFlag.aliases) {
                aliases[alias] = additionalFlag.name;
            }
        }
    }

    const resolvedAliases = resolveAliases(flags, aliases, config.caseStyle);

    let activeFlag: FLAG | undefined;

    let parent: [RouteMap<CONTEXT>, string] | undefined;
    let current: RoutingTarget<CONTEXT> = root;

    let target: RoutingTarget<CONTEXT> | undefined;
    let treatInputsAsArguments = false;

    return {
        next: (input) => {
            if (!treatInputsAsArguments && config.allowArgumentEscapeSequence && input === "--") {
                treatInputsAsArguments = true;
                unprocessedInputs.push(input);
                return;
            }

            if (!treatInputsAsArguments && !activeFlag) {
                try {
                    const nextFlags = findFlagsByArgument(input, flags, {}, resolvedAliases, config);
                    for (const currentFlag of nextFlags) {
                        // Non-global flags are only active on the root
                        if (!currentFlag[1].global && current !== root) {
                            continue;
                        }
                        activeFlag = currentFlag[1];
                        target = current;
                        // After the first flag is found, discard all other implied flags for this input.
                        return;
                    }
                } catch {
                    // Ignore errors from flag scanning, as these are only the additional flags.
                    // If there's a target, flags will be added to the unprocessed inputs and processed later.
                }
            }

            if (target || treatInputsAsArguments) {
                unprocessedInputs.push(input);
                return;
            }

            if (current.kind === CommandSymbol) {
                target = current;
                unprocessedInputs.push(input);
                return;
            }

            const camelCaseRouteName = convertKebabCaseToCamelCase(input);
            let internalRouteName = input;
            let next = current.getRoutingTargetForInput(internalRouteName);
            if (config.caseStyle === "allow-kebab-for-camel" && !next) {
                next = current.getRoutingTargetForInput(camelCaseRouteName);
                if (next) {
                    internalRouteName = camelCaseRouteName;
                }
            }

            if (!next) {
                const defaultCommand = current.getDefaultCommand();
                if (defaultCommand) {
                    parent = [current, ""];
                    unprocessedInputs.push(input);
                    current = defaultCommand;
                    return;
                }
                return { input, routeMap: current };
            }

            parent = [current, input];
            current = next;
            prefix.push(input);
        },
        finish: (): InternalRouteScanResult<FLAG, CONTEXT> => {
            target = target ?? current;

            if (target.kind === RouteMapSymbol && !activeFlag) {
                const defaultCommand = target.getDefaultCommand();
                if (defaultCommand) {
                    parent = [target, ""];
                    target = defaultCommand;
                }
            }

            const aliases = parent
                ? parent[0].getOtherAliasesForInput(parent[1], config.caseStyle)
                : { original: [], "convert-camel-to-kebab": [] };

            return {
                target,
                unprocessedInputs,
                prefix,
                aliases,
                activeFlag,
            };
        },
    };
}
