// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* eslint-disable @typescript-eslint/unified-signatures */
import { withDefaults, type PartialApplicationConfiguration } from "../config";
import type { CommandContext } from "../context";
import { type Command } from "../routing/command/types";
import type { RouteMap } from "../routing/route-map/types";
import type { RoutingTarget } from "../routing/types";
import type { ApplicationText } from "../text";
import { InternalError } from "../util/error";
import { checkIntegrationsForCollisions, checkIntegrationsForFlagNameConflicts, gatherAdditionalFlagsFromIntegrations, gatherDefaultIntegrations, validateIntegrations, type StricliIntegration } from "./integration";
import type { Application } from "./types";

/**
 * Builds an application from a top-level route map {@link RouteMap} and configuration {@link ApplicationConfiguration}.
 *
 */
export function buildApplication<CONTEXT extends CommandContext>(
    root: RouteMap<CONTEXT>,
    config: PartialApplicationConfiguration,
    integrations?: Readonly<Record<string, StricliIntegration<CONTEXT>>>,
): Application<CONTEXT>;
/**
 * Builds an application with a single, top-level command {@link Command} and configuration {@link ApplicationConfiguration}.
 *
 */
export function buildApplication<CONTEXT extends CommandContext>(
    command: Command<CONTEXT>,
    appConfig: PartialApplicationConfiguration,
    integrations?: Readonly<Record<string, StricliIntegration<CONTEXT>>>,
): Application<CONTEXT>;
export function buildApplication<CONTEXT extends CommandContext>(
    root: RoutingTarget<CONTEXT>,
    appConfig: PartialApplicationConfiguration,
    integrations?: Readonly<Record<string, StricliIntegration<CONTEXT>>>,
): Application<CONTEXT> {
    const config = withDefaults(appConfig);
    let defaultText: ApplicationText;
    if ("text" in config.localization) {
        defaultText = config.localization.text;
    } else {
        const text = config.localization.loadText(config.localization.defaultLocale);
        if (!text) {
            throw new InternalError(`No text available for the default locale "${config.localization.defaultLocale}"`);
        }
        defaultText = text;
    }
    if (integrations) {
        checkIntegrationsForCollisions(integrations, config.scanner.caseStyle);
    } else {
        integrations = gatherDefaultIntegrations(config, defaultText);
    }
    const additionalFlags = gatherAdditionalFlagsFromIntegrations(integrations);
    checkIntegrationsForFlagNameConflicts(root, additionalFlags, config.scanner.caseStyle);
    validateIntegrations(integrations, root, config);
    return {
        root,
        config,
        defaultText,
        integrations,
    };
}
