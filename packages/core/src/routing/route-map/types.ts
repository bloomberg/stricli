// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DisplayCaseStyle, ScannerCaseStyle } from "../../config";
import type { CommandContext } from "../../context";
import type { Command } from "../command/types";
import type { DocumentedTarget, RoutingTarget } from "../types";

export const RouteMapSymbol = Symbol("RouteMap");

export interface RouteMapEntry<CONTEXT extends CommandContext> {
    readonly name: Readonly<Record<DisplayCaseStyle, string>>;
    readonly target: RoutingTarget<CONTEXT>;
    readonly aliases: readonly string[];
    readonly hidden: boolean;
}

/**
 * Route map that stores multiple routes.
 */
export interface RouteMap<CONTEXT extends CommandContext> extends DocumentedTarget {
    readonly kind: typeof RouteMapSymbol;
    readonly getRoutingTargetForInput: (input: string) => RoutingTarget<CONTEXT> | undefined;
    readonly getDefaultCommand: () => Command<CONTEXT> | undefined;
    readonly getOtherAliasesForInput: (
        input: string,
        caseStyle: ScannerCaseStyle,
    ) => Readonly<Record<DisplayCaseStyle, readonly string[]>>;
    readonly getAllEntries: () => readonly RouteMapEntry<CONTEXT>[];
}
