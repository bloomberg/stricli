// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import { convertCamelCaseToKebabCase, convertKebabCaseToCamelCase } from "../../util/case-style";
import { InternalError } from "../../util/error";
import type { RoutingTarget } from "../types";
import { generateRouteMapHelpLines, type RouteMapDocumentation } from "./documentation";
import { RouteMapSymbol, type RouteMap } from "./types";

export type RouteMapRoutes<R extends string, CONTEXT extends CommandContext> = Readonly<
    Record<R, RoutingTarget<CONTEXT>>
>;

type RouteMapAliases<R extends string> = Readonly<Record<Exclude<string, R>, R>>;

export interface RouteMapBuilderArguments<R extends string, CONTEXT extends CommandContext> {
    /**
     * Mapping of names to routing targets (commands or other route maps).
     * Must contain at least one route to be a valid route map.
     */
    readonly routes: RouteMapRoutes<R, CONTEXT>;
    /**
     * When the command line inputs navigate directly to a route map, the default behavior is to print the help text.
     *
     * If this value is present, the command at the specified route will be run instead.
     * This means that otherwise invalid routes will not throw an error and will be considered as arguments/flags to that command.
     *
     * The type checking for this property requires it must be a valid route, but it does not type check that this route points to a command.
     * If this value is a route for a route map instead of a command, that is invalid and `buildRouteMap` will throw an error.
     */
    readonly defaultCommand?: NoInfer<R>;
    /**
     * Help documentation for route map.
     */
    readonly docs: RouteMapDocumentation<R>;
    /**
     * If specified, aliases can be used instead of the original route name to resolve to a given route.
     */
    readonly aliases?: RouteMapAliases<R>;
}

/**
 * Build route map from name-route mapping with documentation.
 */
export function buildRouteMap<R extends string, CONTEXT extends CommandContext = CommandContext>({
    routes,
    defaultCommand: defaultCommandRoute,
    docs,
    aliases,
}: RouteMapBuilderArguments<R, CONTEXT>): RouteMap<CONTEXT> {
    if (Object.entries(routes).length === 0) {
        throw new InternalError("Route map must contain at least one route");
    }
    const activeAliases: Record<string, R> = aliases ?? {};
    const aliasesByRoute = new Map<string, readonly string[]>();
    for (const [alias, routeName] of Object.entries(activeAliases)) {
        if (alias in routes) {
            throw new InternalError(`Cannot use "${alias}" as an alias when a route with that name already exists`);
        }
        const routeAliases = aliasesByRoute.get(routeName) ?? [];
        aliasesByRoute.set(routeName, [...routeAliases, alias]);
    }
    const defaultCommand = defaultCommandRoute ? routes[defaultCommandRoute] : void 0;
    if (defaultCommand && defaultCommand.kind === RouteMapSymbol) {
        throw new InternalError(
            `Cannot use "${defaultCommandRoute}" as the default command because it is not a Command`,
        );
    }
    const resolveRouteName = (input: string): R | undefined => {
        if (input in activeAliases) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return activeAliases[input]!;
        } else if (input in routes) {
            return input as R;
        }
    };
    return {
        kind: RouteMapSymbol,
        get brief(): string {
            return docs.brief;
        },
        formatUsageLine(args) {
            const routeNames = this.getAllEntries()
                .filter((entry) => !entry.hidden)
                .map((entry) => entry.name[args.config.caseStyle]);
            return `${args.prefix.join(" ")} ${routeNames.join("|")} ...`;
        },
        formatHelp: (config) => {
            const lines = [...generateRouteMapHelpLines(routes, docs, config)];
            const text = lines.join("\n");
            return text + "\n";
        },
        getDefaultCommand: () => {
            return defaultCommand;
        },
        getOtherAliasesForInput: (input, caseStyle) => {
            if (defaultCommandRoute) {
                if (input === defaultCommandRoute) {
                    return {
                        original: [""],
                        "convert-camel-to-kebab": [""],
                    };
                }

                if (input === "") {
                    return {
                        original: [defaultCommandRoute],
                        "convert-camel-to-kebab": [defaultCommandRoute],
                    };
                }
            }
            const camelInput = convertKebabCaseToCamelCase(input);
            let routeName = resolveRouteName(input);
            if (!routeName && caseStyle === "allow-kebab-for-camel") {
                routeName = resolveRouteName(camelInput);
            }
            /* c8 ignore start */
            if (!routeName) {
                return {
                    original: [],
                    "convert-camel-to-kebab": [],
                };
            }
            /* c8 ignore stop */
            const otherAliases = [routeName, ...(aliasesByRoute.get(routeName) ?? [])].filter(
                (alias) => alias !== input && alias !== camelInput,
            );
            return {
                original: otherAliases,
                "convert-camel-to-kebab": otherAliases.map(convertCamelCaseToKebabCase),
            };
        },
        getRoutingTargetForInput: (input) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const routeName = input in activeAliases ? activeAliases[input]! : input;
            return routes[routeName as keyof R & string];
        },
        getAllEntries() {
            const hiddenRoutes = docs.hideRoute;
            return Object.entries<RoutingTarget<CONTEXT>>(routes).map(([originalRouteName, target]) => {
                return {
                    name: {
                        original: originalRouteName,
                        "convert-camel-to-kebab": convertCamelCaseToKebabCase(originalRouteName),
                    },
                    target,
                    aliases: aliasesByRoute.get(originalRouteName) ?? [],
                    hidden: hiddenRoutes?.[originalRouteName as R] ?? false,
                };
            });
        },
    };
}
