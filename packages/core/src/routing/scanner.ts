// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DisplayCaseStyle, ScannerConfiguration } from "../config";
import type { CommandContext } from "../context";
import { convertKebabCaseToCamelCase } from "../util/case-style";
import { CommandSymbol } from "./command/types";
import { RouteMapSymbol, type RouteMap } from "./route-map/types";
import type { RoutingTarget } from "./types";

/**
 * @internal
 */
export type HelpRequested = false | true | "all";

/**
 * @internal
 */
export interface RouteScanResult<CONTEXT extends CommandContext> {
    readonly target: RoutingTarget<CONTEXT>;
    readonly unprocessedInputs: readonly string[];
    readonly helpRequested: HelpRequested;
    readonly prefix: readonly string[];
    readonly rootLevel: boolean;
    readonly aliases: Readonly<Record<DisplayCaseStyle, readonly string[]>>;
}

/**
 * @internal
 */
export interface RouteNotFoundError<CONTEXT extends CommandContext> {
    readonly input: string;
    readonly routeMap: RouteMap<CONTEXT>;
}

interface RouteScanner<CONTEXT extends CommandContext> {
    readonly next: (input: string) => RouteNotFoundError<CONTEXT> | undefined;
    readonly finish: () => RouteScanResult<CONTEXT>;
}

/**
 * @internal
 */
export function buildRouteScanner<CONTEXT extends CommandContext>(
    root: RoutingTarget<CONTEXT>,
    config: ScannerConfiguration,
    startingPrefix: readonly string[],
): RouteScanner<CONTEXT> {
    const prefix = [...startingPrefix];
    const unprocessedInputs: string[] = [];
    let parent: [RouteMap<CONTEXT>, string] | undefined;
    let current: RoutingTarget<CONTEXT> = root;

    let target: RoutingTarget<CONTEXT> | undefined;
    let rootLevel = true;
    let helpRequested: HelpRequested = false;

    return {
        next: (input) => {
            if (input === "--help" || input === "-h") {
                helpRequested = true;
                if (!target) {
                    target = current;
                }
                return;
            } else if (input === "--helpAll" || input === "--help-all" || input === "-H") {
                helpRequested = "all";
                if (!target) {
                    target = current;
                }
                return;
            }

            if (target) {
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
                    rootLevel = false;
                    parent = [current, ""];
                    unprocessedInputs.push(input);
                    current = defaultCommand;
                    return;
                }
                return { input, routeMap: current };
            }

            rootLevel = false;
            parent = [current, input];
            current = next;
            prefix.push(input);
        },
        finish: (): RouteScanResult<CONTEXT> => {
            target = target ?? current;

            if (target.kind === RouteMapSymbol && !helpRequested) {
                const defaultCommand = target.getDefaultCommand();
                if (defaultCommand) {
                    parent = [target, ""];
                    target = defaultCommand;
                    rootLevel = false;
                }
            }

            const aliases = parent
                ? parent[0].getOtherAliasesForInput(parent[1], config.caseStyle)
                : { original: [], "convert-camel-to-kebab": [] };

            return {
                target,
                unprocessedInputs,
                helpRequested,
                prefix,
                rootLevel,
                aliases,
            };
        },
    };
}
