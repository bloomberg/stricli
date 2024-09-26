// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DocumentationText } from "../text";
import type { CommandContext } from "../context";
import type { UsageFormattingArguments } from "../parameter/formatting";
import type { Command } from "./command/types";
import type { RouteMap } from "./route-map/types";

export interface HelpFormattingArguments extends UsageFormattingArguments {
    readonly text: DocumentationText;
    readonly includeHelpAllFlag: boolean;
    readonly includeVersionFlag: boolean;
    readonly includeArgumentEscapeSequenceFlag: boolean;
    readonly includeHidden: boolean;
    readonly aliases?: readonly string[];
}

export interface DocumentedTarget {
    readonly brief: string;
    readonly formatUsageLine: (args: UsageFormattingArguments) => string;
    readonly formatHelp: (args: HelpFormattingArguments) => string;
}

export type RoutingTarget<CONTEXT extends CommandContext> = Command<CONTEXT> | RouteMap<CONTEXT>;

export interface RoutingTargetCompletion {
    readonly kind: "routing-target:command" | "routing-target:route-map";
    readonly completion: string;
    readonly brief: string;
}
