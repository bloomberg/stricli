// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { checkEnvironmentVariable, type CommandContext, type StricliDynamicCommandContext } from "../context";
import { ExitCode } from "../exit-code";
import { listAllRouteNamesAndAliasesForScan } from "../parameter/scanner";
import { runCommand } from "../routing/command/run";
import { RouteMapSymbol } from "../routing/route-map/types";
import { buildRouteScanner, type RouteNotFoundError } from "../routing/scanner";
import { shouldUseAnsiColor } from "../text";
import { filterClosestAlternatives } from "../util/distance";
import type { Application } from "./types";

/**
 * Run application with given arguments and asynchronously return exit code.
 */
export async function runApplication<CONTEXT extends CommandContext>(
    { root, defaultText, config }: Application<CONTEXT>,
    rawInputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
): Promise<number> {
    let text = defaultText;
    if (context.locale) {
        const localeText = config.localization.loadText(context.locale);
        if (localeText) {
            text = localeText;
        } else {
            const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, config.documentation);
            const warningMessage = text.noTextAvailableForLocale({
                requestedLocale: context.locale,
                defaultLocale: config.localization.defaultLocale,
                ansiColor,
            });
            context.process.stderr.write(
                ansiColor ? `\x1B[1m\x1B[33m${warningMessage}\x1B[39m\x1B[22m\n` : `${warningMessage}\n`,
            );
        }
    }

    if (
        config.versionInfo?.getLatestVersion &&
        !checkEnvironmentVariable(context.process, "STRICLI_SKIP_VERSION_CHECK")
    ) {
        let currentVersion: string;
        if ("currentVersion" in config.versionInfo) {
            currentVersion = config.versionInfo.currentVersion;
        } else {
            currentVersion = await config.versionInfo.getCurrentVersion.call(context);
        }
        const latestVersion = await config.versionInfo.getLatestVersion.call(context, currentVersion);
        if (latestVersion && currentVersion !== latestVersion) {
            const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, config.documentation);
            const warningMessage = text.currentVersionIsNotLatest({
                currentVersion,
                latestVersion,
                upgradeCommand: config.versionInfo.upgradeCommand,
                ansiColor,
            });
            context.process.stderr.write(
                ansiColor ? `\x1B[1m\x1B[33m${warningMessage}\x1B[39m\x1B[22m\n` : `${warningMessage}\n`,
            );
        }
    }

    const inputs = rawInputs.slice();
    if (config.versionInfo && (inputs[0] === "--version" || inputs[0] === "-v")) {
        let currentVersion: string;
        if ("currentVersion" in config.versionInfo) {
            currentVersion = config.versionInfo.currentVersion;
        } else {
            currentVersion = await config.versionInfo.getCurrentVersion.call(context);
        }
        context.process.stdout.write(currentVersion + "\n");
        return ExitCode.Success;
    }

    const scanner = buildRouteScanner(root, config.scanner, [config.name]);
    let error: RouteNotFoundError<CONTEXT> | undefined;
    while (inputs.length > 0 && !error) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const arg = inputs.shift()!;
        error = scanner.next(arg);
    }
    if (error) {
        const routeNames = listAllRouteNamesAndAliasesForScan(
            error.routeMap,
            config.scanner.caseStyle,
            config.completion,
        );
        const corrections = filterClosestAlternatives(error.input, routeNames, config.scanner.distanceOptions).map(
            (str) => `\`${str}\``,
        );
        const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, config.documentation);
        const errorMessage = text.noCommandRegisteredForInput({ input: error.input, corrections, ansiColor });
        context.process.stderr.write(
            ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
        );
        return ExitCode.UnknownCommand;
    }
    const result = scanner.finish();

    if (result.helpRequested || result.target.kind === RouteMapSymbol) {
        const ansiColor = shouldUseAnsiColor(context.process, context.process.stdout, config.documentation);
        context.process.stdout.write(
            result.target.formatHelp({
                prefix: result.prefix,
                includeVersionFlag: Boolean(config.versionInfo) && result.rootLevel,
                includeArgumentEscapeSequenceFlag: config.scanner.allowArgumentEscapeSequence,
                includeHelpAllFlag: result.helpRequested === "all" || config.documentation.alwaysShowHelpAllFlag,
                includeHidden: result.helpRequested === "all",
                config: config.documentation,
                aliases: result.aliases[config.documentation.caseStyle],
                text,
                ansiColor,
            }),
        );
        return ExitCode.Success;
    }

    let commandContext: CONTEXT;
    if ("forCommand" in context) {
        try {
            commandContext = await context.forCommand({ prefix: result.prefix });
        } catch (exc) {
            const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, config.documentation);
            const errorMessage = text.exceptionWhileLoadingCommandContext(exc, ansiColor);
            context.process.stderr.write(ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m` : errorMessage);
            return ExitCode.ContextLoadError;
        }
    } else {
        commandContext = context;
    }
    return runCommand(result.target, {
        context: commandContext,
        inputs: result.unprocessedInputs,
        scannerConfig: config.scanner,
        documentationConfig: config.documentation,
        errorFormatting: text,
        determineExitCode: config.determineExitCode,
    });
}
