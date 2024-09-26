// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DisplayCaseStyle } from "../config";
import type { CommandContext } from "../context";
import { CommandSymbol, type Command } from "../routing/command/types";
import { RouteMapSymbol, type RouteMap } from "../routing/route-map/types";
import { InternalError } from "../util/error";
import type { Application } from "./types";

export type DocumentedCommand = readonly [route: string, helpText: string];

type CommandWithRoute = readonly [
    route: readonly string[],
    command: Command<CommandContext>,
    aliases: readonly string[],
];

function* iterateAllCommands(
    routeMap: RouteMap<CommandContext>,
    prefix: readonly string[],
    caseStyle: DisplayCaseStyle,
): Generator<CommandWithRoute> {
    for (const entry of routeMap.getAllEntries()) {
        if (entry.hidden) {
            continue;
        }
        const routeName = entry.name[caseStyle];
        const route = [...prefix, routeName];
        if (entry.target.kind === RouteMapSymbol) {
            yield* iterateAllCommands(entry.target, route, caseStyle);
        } else {
            yield [route, entry.target, entry.aliases];
        }
    }
}

/**
 * Generate help text in the given locale for each command in this application.
 * Return value is an array of tuples containing the route to that command and the help text.
 *
 * If no locale specified, uses the defaultLocale from the application configuration.
 */
export function generateHelpTextForAllCommands(
    { root, defaultText, config }: Application<CommandContext>,
    locale?: string,
): readonly DocumentedCommand[] {
    let text = defaultText;
    if (locale) {
        const localeText = config.localization.loadText(locale);
        if (localeText) {
            text = localeText;
        } else {
            throw new InternalError(`Application does not support "${locale}" locale`);
        }
    }
    const commands: CommandWithRoute[] = [];
    if (root.kind === CommandSymbol) {
        commands.push([[config.name], root, []]);
    } else {
        commands.push(...iterateAllCommands(root, [config.name], config.documentation.caseStyle));
    }
    return commands.map(([route, command, aliases]) => {
        return [
            route.join(" "),
            command.formatHelp({
                prefix: route,
                config: config.documentation,
                includeVersionFlag: Boolean(config.versionInfo) && route.length === 1,
                includeArgumentEscapeSequenceFlag: config.scanner.allowArgumentEscapeSequence,
                includeHelpAllFlag: config.documentation.alwaysShowHelpAllFlag,
                includeHidden: false,
                aliases,
                text,
                ansiColor: false,
            }),
        ];
    });
}
