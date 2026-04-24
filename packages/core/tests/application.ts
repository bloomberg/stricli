// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { type CommandContext, type RouteMapBuilderArguments, buildCommand, buildRouteMap } from "../src";

export function buildRouteMapForFakeContext<R extends string>(args: RouteMapBuilderArguments<R, CommandContext>) {
    return buildRouteMap(args);
}

export function buildBasicCommand() {
    return buildCommand({
        loader: async () => {
            return {
                default: async () => {},
            };
        },
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [],
            },
            flags: {},
        },
        docs: {
            brief: "basic command",
        },
    });
}

export function buildBasicRouteMap(brief: string) {
    return buildRouteMapForFakeContext({
        routes: {
            command: buildBasicCommand(),
        },
        docs: {
            brief,
        },
    });
}
