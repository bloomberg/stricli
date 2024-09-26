// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* eslint-disable @typescript-eslint/unified-signatures */
import { withDefaults, type PartialApplicationConfiguration } from "../config";
import type { CommandContext } from "../context";
import { CommandSymbol, type Command } from "../routing/command/types";
import type { RouteMap } from "../routing/route-map/types";
import type { RoutingTarget } from "../routing/types";
import { InternalError } from "../util/error";
import type { Application } from "./types";

/**
 * Builds an application from a top-level route map and configuration.
 */
export function buildApplication<CONTEXT extends CommandContext>(
    root: RouteMap<CONTEXT>,
    config: PartialApplicationConfiguration,
): Application<CONTEXT>;
/**
 * Builds an application with a single, top-level command and configuration.
 */
export function buildApplication<CONTEXT extends CommandContext>(
    command: Command<CONTEXT>,
    appConfig: PartialApplicationConfiguration,
): Application<CONTEXT>;
export function buildApplication<CONTEXT extends CommandContext>(
    root: RoutingTarget<CONTEXT>,
    appConfig: PartialApplicationConfiguration,
): Application<CONTEXT> {
    const config = withDefaults(appConfig);
    if (root.kind === CommandSymbol && config.versionInfo) {
        if (root.usesFlag("version")) {
            throw new InternalError("Unable to use command with flag --version as root when version info is supplied");
        }
        if (root.usesFlag("v")) {
            throw new InternalError("Unable to use command with alias -v as root when version info is supplied");
        }
    }
    const defaultText = config.localization.loadText(config.localization.defaultLocale);
    if (!defaultText) {
        throw new InternalError(`No text available for the default locale "${config.localization.defaultLocale}"`);
    }
    return {
        root,
        config,
        defaultText,
    };
}
