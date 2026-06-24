// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { ApplicationConfiguration, CompletionConfiguration, ScannerCaseStyle } from "../config";
import type { ApplicationContext, CommandContext } from "../context";
import type { AdditionalFlagDocumentation } from "../parameter/flag/formatting";
import type { ArgumentCompletion } from "../parameter/scanner";
import type { AvailableAlias } from "../parameter/types";
import { CommandSymbol } from "../routing/command/types";
import type { AdditionalFlag, RouteScanResult } from "../routing/scanner";
import type { RoutingTarget } from "../routing/types";
import type { ApplicationText } from "../text";
import { convertCamelCaseToKebabCase, convertKebabCaseToCamelCase } from "../util/case-style";
import { InternalError } from "../util/error";
import { help } from "./integrations/help";
import { version } from "./integrations/version";
import type { Application } from "./types";

/**
 * Base arguments that are provided for all application lifecycle hooks.
 */
export type ApplicationHookArguments = {
    /**
     * The current ApplicationText for the application, which was loaded based on the locale specified in the context.
     */
    readonly text: ApplicationText;
    /**
     * Determines whether ANSI color codes should be used in output.
     * The value comes from Stricli's internal logic, and is calculated from the environment and the color depth of the streams.
     * All integrations should honor this value when formatting output, and should not override it based on their own logic.
     */
    readonly ansiColorByStream: Record<"stdout" | "stderr", boolean>;
};

/**
 * Function signature for an application lifecycle hook that can be registered by an integration.
 */
export type ApplicationHook<ARGS extends ApplicationHookArguments = ApplicationHookArguments> = (
    this: CommandContext,
    args: ARGS,
) => void | Promise<void>;

type ApplicationHooks = {
    /**
     * This hook is called when the application starts, before any command is executed.
     */
    "app:start"?: ApplicationHook<ApplicationHookArguments>;
    /**
     * This hook is called just before the application ends, and includes the intended exit code.
     */
    "app:end"?: ApplicationHook<ApplicationHookArguments & { readonly exitCode: number }>;
};

/**
 * Base arguments that are provided for all command lifecycle hooks.
 */
export type CommandHookArguments<CONTEXT extends CommandContext> = ApplicationHookArguments & {
    /**
     * The result of the initial application-level route scan which determines which command to execute and what application flags are active.
     */
    readonly result: RouteScanResult<CONTEXT>;
};

/**
 * Function signature for a command lifecycle hook that can be registered by an integration.
 */
export type CommandHook<
    CONTEXT extends CommandContext,
    ARGS extends CommandHookArguments<CONTEXT> = CommandHookArguments<CONTEXT>,
> = (this: CONTEXT, args: ARGS) => void | Promise<void>;

type CommandHooks<CONTEXT extends CommandContext> = {
    /**
     * This hook is called when a command is about to be executed.
     * Note that this hook will not be called if no command is run (for example, if the user only requested help text).
     */
    "command:start"?: CommandHook<CONTEXT, CommandHookArguments<CONTEXT>>;
    /**
     * This hook is called after a command has finished executing, and includes the exit code of the command.
     * Note that this hook will not be called if no command is run (for example, if the user only requested help text).
     */
    "command:end"?: CommandHook<CONTEXT, CommandHookArguments<CONTEXT> & { readonly exitCode: number }>;
};

/**
 * All supported lifecycle hooks that can be registered by an integration.
 * This includes both application-level hooks and command-level hooks.
 * Stricli will execute the provided callbacks at the appropriate time during the application lifecycle.
 */
export type LifecycleHooks<CONTEXT extends CommandContext> = ApplicationHooks & CommandHooks<CONTEXT>;

/**
 * @internal
 */
export async function runHook<H extends keyof ApplicationHooks, CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
    hookName: H,
    context: CommandContext,
    args: Parameters<NonNullable<ApplicationHooks[H]>>[0],
): Promise<void>;
export async function runHook<H extends keyof CommandHooks<CONTEXT>, CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
    hookName: H,
    context: CONTEXT,
    args: Parameters<NonNullable<CommandHooks<CONTEXT>[H]>>[0],
): Promise<void>;
export async function runHook<H extends keyof LifecycleHooks<CONTEXT>, CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
    hookName: H,
    context: CONTEXT,
    args: Parameters<NonNullable<LifecycleHooks<CONTEXT>[H]>>[0],
): Promise<void> {
    for (const [name, integration] of Object.entries(integrations)) {
        const hook = integration.hooks?.[hookName];
        if (hook) {
            try {
                // @ts-expect-error -- TypeScript is not able to infer that the arguments match the hook function.
                await hook.call(context, args);
            } catch (exc) {
                const errorMessage = args.text.exceptionWhileRunningIntegrationHook({
                    exception: exc,
                    hook: hookName,
                    integration: name,
                    ansiColor: args.ansiColorByStream.stderr,
                });
                context.process.stderr.write(
                    args.ansiColorByStream.stderr
                        ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n`
                        : `${errorMessage}\n`,
                );
            }
        }
    }
}

/**
 * Arguments provided to an application-level flag function, which is called when the flag is detected during route scanning.
 */
export type ApplicationFlagArguments<CONTEXT extends CommandContext> = CommandHookArguments<CONTEXT> & {
    /**
     * List of all additional flags that were provided by integrations.
     * If the target route is not the root of the application, non-global flags will be filtered out of this list.
     */
    readonly additionalFlags: readonly AdditionalFlagDocumentation[];
};

/**
 * Function signature for an application flag that can be provided by an integration.
 */
export type ApplicationFlagFunction<CONTEXT extends CommandContext> = (
    this: ApplicationContext,
    app: Application<CONTEXT>,
    args: ApplicationFlagArguments<CONTEXT>,
) => void | Promise<void>;

/**
 * Application-level flag that can be provided by an integration.
 */
export type ApplicationFlag<CONTEXT extends CommandContext> = AdditionalFlag & {
    /**
     * When then inputs target a route map, there is no command to execute.
     * Prior to the addition of integrations, the application would print the help text for the route map and exit successfully.
     * When this option is enabled, the application will make this flag active for that route map and run it.
     * There cannot be more than one integration that provides a default flag for route maps, and if multiple integrations provide this option, an error will be thrown when the application is built.
     *
     * Now that `--help` is provided an integration, this option allows the application to continue to provide the same behavior as before.
     * As such, this option won't be relevant for most integrations that are meant to be used with the default `--help` integration.
     */
    readonly defaultForRouteMap?: boolean;
    /**
     * When the flag is detected during route scanning, this function will be called.
     * It is invoked with the *{@link ApplicationContext}* (not the generic {@link CONTEXT}), the application itself, and additional
     * arguments that provide information about the current state of the application and the route scan result.
     */
    readonly run: ApplicationFlagFunction<CONTEXT>;
};

/**
 * @internal
 */
export function checkIntegrationsForCollisions<CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
    caseStyle: ScannerCaseStyle,
): void {
    let routeMapDefault: string | undefined;
    const flagNames = new Set(Object.keys(integrations));
    const aliases = new Map<AvailableAlias, string>();
    for (const [name, integration] of Object.entries(integrations)) {
        if (caseStyle === "allow-kebab-for-camel") {
            const camelCase = convertKebabCaseToCamelCase(name);
            if (camelCase !== name && flagNames.has(camelCase)) {
                throw new InternalError(
                    `Multiple integrations are trying to use the same flag name (with 'allow-kebab-for-camel'): '${name}' and '${camelCase}'`,
                );
            }
        }
        if (integration.flag) {
            if (integration.flag.defaultForRouteMap) {
                if (routeMapDefault) {
                    throw new InternalError(
                        `Multiple integrations provide a default flag for route maps: '${routeMapDefault}' and '${name}'`,
                    );
                }
                routeMapDefault = name;
            }
            for (const alias of integration.flag.aliases ?? []) {
                const flagForAlias = aliases.get(alias);
                if (flagForAlias) {
                    throw new InternalError(
                        `Multiple integrations are trying to use the same flag alias "-${alias}": '${flagForAlias}' and '${name}'`,
                    );
                }
                aliases.set(alias, name);
            }
        }
    }
}

export function checkIntegrationsForFlagNameConflicts<CONTEXT extends CommandContext>(
    root: RoutingTarget<CONTEXT>,
    additionalFlags: readonly Pick<AdditionalFlag, "name" | "aliases" | "global">[],
    caseStyle: ScannerCaseStyle,
): void {
    function checkForConflicts(target: RoutingTarget<CONTEXT>, prefix: string[]): void {
        if (target.kind === CommandSymbol) {
            const relevantFlags = root === target ? additionalFlags : additionalFlags.filter(({ global }) => global);
            for (const { name, aliases } of relevantFlags) {
                if (target.usesFlag(name, caseStyle)) {
                    throw new InternalError(
                        `'${name}' integration provides a flag that would override: "${[...prefix, `--${name}`].join(" ")}"`,
                    );
                }
                for (const alias of aliases ?? []) {
                    if (target.usesFlag(alias, caseStyle)) {
                        throw new InternalError(
                            `'${name}' integration provides a flag with an alias that would override: "${[...prefix, `-${alias}`].join(" ")}"`,
                        );
                    }
                }
            }
        } else {
            for (const entry of target.getAllEntries()) {
                checkForConflicts(entry.target, [...prefix, entry.name.original]);
            }
        }
    }

    checkForConflicts(root, []);
}

/**
 * @internal
 */
export function gatherAdditionalFlagsFromIntegrations<CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
): ApplicationFlag<CONTEXT>[] {
    const flags: ApplicationFlag<CONTEXT>[] = [];
    for (const [name, integration] of Object.entries(integrations)) {
        if (integration.flag) {
            flags.push({ ...integration.flag, name });
        }
    }
    return flags;
}

/**
 * @internal
 */
export function proposeCompletionsForAdditionalFlags(
    additionalFlags: readonly AdditionalFlag[],
    config: CompletionConfiguration,
    caseStyle: ScannerCaseStyle,
    partial: string,
): readonly ArgumentCompletion[] {
    const possibleCompletions: ArgumentCompletion[] = [];
    for (const flag of additionalFlags) {
        if (!flag.complete || (flag.hidden && !config.includeHiddenRoutes)) {
            continue;
        }
        possibleCompletions.push({
            kind: "argument:flag",
            completion: `--${flag.name}`,
            brief: flag.brief,
        });
        if (config.includeAliases) {
            for (const alias of flag.aliases ?? []) {
                possibleCompletions.push({
                    kind: "argument:flag",
                    completion: `-${alias}`,
                    brief: flag.brief,
                });
            }
        }
        if (caseStyle === "allow-kebab-for-camel") {
            const kebabName = convertCamelCaseToKebabCase(flag.name);
            if (kebabName !== flag.name) {
                possibleCompletions.push({
                    kind: "argument:flag",
                    completion: `--${kebabName}`,
                    brief: flag.brief,
                });
            }
        }
    }
    return possibleCompletions.filter(({ completion }) => completion.startsWith(partial));
}

/**
 * An integration is a set of additional functionality that can apply to application runs without modifying the structure of the application itself.
 */
export type StricliIntegration<CONTEXT extends CommandContext> = {
    /**
     * Additional validation that can be performed by the integration when the application is built.
     * This can be used to ensure that the integration is compatible with the application configuration.
     * If the validation fails, an error should be thrown.
     * The integration name will be included in the error message, so it is not necessary to include it in the error message thrown by the integration.
     */
    readonly validate?: (root: RoutingTarget<CONTEXT>, config: ApplicationConfiguration) => void;
    /**
     * Lifecycle hooks provided by the integration that should be executed at the appropriate times during the application lifecycle.
     */
    readonly hooks?: LifecycleHooks<CONTEXT>;
    /**
     * If provided, registers an additional flag in the application to provide custom functionality.
     */
    readonly flag?: Omit<ApplicationFlag<CONTEXT>, "name">;
};

/**
 * @internal
 */
export function validateIntegrations<CONTEXT extends CommandContext>(
    integrations: Record<string, StricliIntegration<CONTEXT>>,
    root: RoutingTarget<CONTEXT>,
    config: ApplicationConfiguration,
): void {
    for (const [name, integration] of Object.entries(integrations)) {
        try {
            integration.validate?.(root, config);
        } catch (exc) {
            throw new InternalError(`Integration '${name}' failed validation: ${String(exc)}`, { cause: exc });
        }
    }
}

/**
 * @internal
 */
export function gatherDefaultIntegrations<CONTEXT extends CommandContext>(
    config: ApplicationConfiguration,
    text: ApplicationText,
): Record<string, StricliIntegration<CONTEXT>> {
    /* eslint-disable @typescript-eslint/no-deprecated */
    const integrations: Record<string, StricliIntegration<CONTEXT>> = {
        help: help({
            brief: text.briefs.help,
            alias: "h",
            includeHidden: false,
            formatting: config.documentation,
        }),
        helpAll: help({
            brief: text.briefs.helpAll,
            alias: "H",
            hidden: !config.documentation.alwaysShowHelpAllFlag,
            includeHidden: true,
            formatting: config.documentation,
        }),
    };

    if (config.versionInfo) {
        integrations["version"] = version({
            brief: text.briefs.version,
            info: config.versionInfo,
            alias: "v",
            hook: "app:start",
        });
    }

    return integrations;
    /* eslint-enable @typescript-eslint/no-deprecated */
}
