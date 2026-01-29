// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import { formatForDisplay } from "../../config";
import { convertCamelCaseToKebabCase } from "../../util/case-style";
import { formatRowsWithColumns } from "../../util/formatting";
import type { HelpFormattingArguments } from "../types";
import type { RouteMapRoutes } from "./builder";
import { formatDocumentationForFlagParameters, generateBuiltInFlagUsageLines } from "../../parameter/flag/formatting";

/**
 * Help documentation for route map.
 */
export interface RouteMapDocumentation<R extends string> {
    /**
     * In-line documentation for this route map.
     */
    readonly brief: string;
    /**
     * Longer description of this route map's behavior, only printed during `--help`.
     */
    readonly fullDescription?: string;
    /**
     * Each route name with value `true` will be hidden from all documentation.
     */
    readonly hideRoute?: Readonly<Partial<Record<R, boolean>>>;
}

interface FormattedRow {
    readonly routeName: string;
    readonly brief: string;
    readonly hidden?: boolean;
}

/**
 * @internal
 */
export function* generateRouteMapHelpLines<CONTEXT extends CommandContext>(
    routes: RouteMapRoutes<string, CONTEXT>,
    docs: RouteMapDocumentation<string>,
    args: HelpFormattingArguments,
): Generator<string> {
    const { brief, fullDescription, hideRoute } = docs;
    const { headers } = args.text;
    yield args.ansiColor ? `\x1B[1m${headers.usage}\x1B[22m` : headers.usage;
    for (const [name, route] of Object.entries(routes)) {
        if (!hideRoute || !hideRoute[name] || args.includeHidden) {
            const externalRouteName =
                args.config.caseStyle === "convert-camel-to-kebab" ? convertCamelCaseToKebabCase(name) : name;
            yield `  ${route.formatUsageLine({
                ...args,
                prefix: [...args.prefix, externalRouteName],
            })}`;
        }
    }
    const prefix = args.prefix.join(" ");
    for (const line of generateBuiltInFlagUsageLines(args)) {
        yield `  ${prefix} ${line}`;
    }
    yield "";
    yield fullDescription ?? brief;
    if (args.aliases && args.aliases.length > 0) {
        const aliasPrefix = args.prefix.slice(0, -1).join(" ");
        yield "";
        yield args.ansiColor ? `\x1B[1m${headers.aliases}\x1B[22m` : headers.aliases;
        for (const alias of args.aliases) {
            yield `  ${aliasPrefix} ${alias}`;
        }
    }
    yield "";
    yield args.ansiColor ? `\x1B[1m${headers.flags}\x1B[22m` : headers.flags;
    // Print "empty" parameters to document built-in flags
    for (const line of formatDocumentationForFlagParameters({}, {}, args)) {
        yield `  ${line}`;
    }
    yield "";
    yield args.ansiColor ? `\x1B[1m${headers.commands}\x1B[22m` : headers.commands;
    const visibleRoutes = Object.entries(routes).filter(
        ([name]) => !hideRoute || !hideRoute[name] || args.includeHidden,
    );
    const rows = visibleRoutes.map<FormattedRow>(([internalRouteName, route]) => {
        const externalRouteName = formatForDisplay(internalRouteName, args.config.caseStyle);
        return {
            routeName: externalRouteName,
            brief: route.brief,
            hidden: hideRoute && hideRoute[internalRouteName],
        };
    });
    const formattedRows = formatRowsWithColumns(
        rows.map((row) => {
            if (!args.ansiColor) {
                return [row.routeName, row.brief];
            }
            return [
                row.hidden ? `\x1B[90m${row.routeName}\x1B[39m` : `\x1B[36m${row.routeName}\x1B[39m`,
                row.hidden ? `\x1B[90m${row.brief}\x1B[39m` : `\x1B[03m${row.brief}\x1B[23m`,
            ];
        }),
        ["  "],
    );
    for (const line of formattedRows) {
        yield `  ${line}`;
    }
}
