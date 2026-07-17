// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CompletionConfiguration, ScannerConfiguration } from "../../config";
import type { CommandContext } from "../../context";
import { CommandSymbol } from "../command/types";
import type { RoutingTargetCompletion } from "../types";
import type { RouteMap } from "./types";

export interface RouteMapCompletionArguments {
    readonly partial: string;
    readonly scannerConfig: ScannerConfiguration;
    readonly completionConfig: CompletionConfiguration;
}

export async function proposeCompletionsForRouteMap<CONTEXT extends CommandContext>(
    routeMap: RouteMap<CONTEXT>,
    { partial, scannerConfig, completionConfig }: RouteMapCompletionArguments,
): Promise<readonly RoutingTargetCompletion[]> {
    let entries = routeMap.getAllEntries();
    if (!completionConfig.includeHiddenRoutes) {
        entries = entries.filter((entry) => !entry.hidden);
    }
    const displayCaseStyle =
        scannerConfig.caseStyle === "allow-kebab-for-camel" ? "convert-camel-to-kebab" : scannerConfig.caseStyle;
    return entries
        .flatMap<RoutingTargetCompletion>((entry) => {
            const kind = entry.target.kind === CommandSymbol ? "routing-target:command" : "routing-target:route-map";
            const brief = entry.target.brief;
            const targetCompletion: RoutingTargetCompletion = {
                kind,
                completion: entry.name[displayCaseStyle],
                brief,
            };
            if (completionConfig.includeAliases) {
                return [
                    targetCompletion,
                    ...entry.aliases.map<RoutingTargetCompletion>((alias) => {
                        return {
                            kind,
                            completion: alias,
                            brief,
                        };
                    }),
                ];
            }
            return [targetCompletion];
        })
        .filter(({ completion }) => completion.startsWith(partial));
}
