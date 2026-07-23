// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext, StricliDynamicCommandContext } from "../context";
import { ExitCode } from "../exit-code";
import { listAllRouteNamesAndAliasesForScan } from "../parameter/scanner";
import { runCommand } from "../routing/command/run";
import { RouteMapSymbol } from "../routing/route-map/types";
import { buildRouteScanner, type RouteNotFoundError } from "../routing/scanner";
import { shouldUseAnsiColorForStreams, type ApplicationText } from "../text";
import { filterClosestAlternatives } from "../util/distance";
import { gatherAdditionalFlagsFromIntegrations, runHook } from "./integration";
import type { Application } from "./types";

/**
 * Run application with given arguments and asynchronously return exit code.
 */
export async function runApplication<CONTEXT extends CommandContext>(
    app: Application<CONTEXT>,
    rawInputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
): Promise<number> {
    const ansiColorByStream = shouldUseAnsiColorForStreams(context.process, app.config.documentation);
    let text = app.defaultText;
    if (context.locale && "loadText" in app.config.localization) {
        const localeText = app.config.localization.loadText(context.locale);
        if (localeText) {
            text = localeText;
        } else {
            const warningMessage = text.noTextAvailableForLocale({
                requestedLocale: context.locale,
                defaultLocale: app.config.localization.defaultLocale,
                ansiColor: ansiColorByStream.stderr,
            });
            context.process.stderr.write(
                ansiColorByStream.stderr ? `\x1B[1m\x1B[33m${warningMessage}\x1B[39m\x1B[22m\n` : `${warningMessage}\n`,
            );
        }
    }

    const hookStartExitCode = await runHook(app.integrations, "app:start", context, {
        text,
        ansiColorByStream,
    });
    if (typeof hookStartExitCode === "number") {
        return hookStartExitCode;
    }

    const exitCode = await scanInputsAndRunTarget(app, rawInputs, context, text, ansiColorByStream);

    const hookEndExitCode = await runHook(app.integrations, "app:end", context, {
        text,
        ansiColorByStream,
        exitCode,
    });
    if (typeof hookEndExitCode === "number") {
        return hookEndExitCode;
    }

    return exitCode;
}

async function scanInputsAndRunTarget<CONTEXT extends CommandContext>(
    app: Application<CONTEXT>,
    rawInputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
    text: ApplicationText,
    ansiColorByStream: Record<"stdout" | "stderr", boolean>,
): Promise<number> {
    const additionalFlags = gatherAdditionalFlagsFromIntegrations(app.integrations);

    const inputs = rawInputs.slice();
    const scanner = buildRouteScanner(app.root, app.config.scanner, [app.config.name], additionalFlags);
    let error: RouteNotFoundError<CONTEXT> | undefined;
    while (inputs.length > 0 && !error) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const arg = inputs.shift()!;
        error = scanner.next(arg);
    }

    if (error) {
        const routeNames = listAllRouteNamesAndAliasesForScan(
            error.routeMap,
            app.config.scanner.caseStyle,
            app.config.completion,
        );
        const corrections = filterClosestAlternatives(error.input, routeNames, app.config.scanner.distanceOptions).map(
            (str) => `\`${str}\``,
        );
        const errorMessage = text.noCommandRegisteredForInput({
            input: error.input,
            corrections,
            ansiColor: ansiColorByStream.stderr,
        });
        context.process.stderr.write(
            ansiColorByStream.stderr ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
        );
        return ExitCode.UnknownCommand;
    }
    // eslint-disable-next-line prefer-const
    let { activeFlag, ...result } = scanner.finish();

    if (activeFlag || result.target.kind === RouteMapSymbol) {
        if (!activeFlag) {
            activeFlag = additionalFlags.find((flag) => flag.defaultForRouteMap);
        }
        if (activeFlag) {
            let additionalFlagsForTarget = additionalFlags;
            if (result.target !== app.root) {
                additionalFlagsForTarget = additionalFlagsForTarget.filter((flag) => flag.global);
            }
            try {
                await activeFlag.run.call(context, app, {
                    text,
                    ansiColorByStream,
                    result,
                    additionalFlags: additionalFlagsForTarget,
                });
            } catch (exc) {
                const errorMessage = text.exceptionWhileRunningIntegrationFlag({
                    exception: exc,
                    ansiColor: ansiColorByStream.stderr,
                    integration: activeFlag.name,
                });
                context.process.stderr.write(
                    ansiColorByStream.stderr ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
                );
                return ExitCode.IntegrationError;
            }
        }
        return ExitCode.Success;
    }

    let commandContext: CONTEXT;
    if ("forCommand" in context) {
        try {
            commandContext = await context.forCommand({
                ...result,
                target: result.target,
            });
        } catch (exc) {
            const errorMessage = text.exceptionWhileLoadingCommandContext(exc, ansiColorByStream.stderr);
            context.process.stderr.write(
                ansiColorByStream.stderr ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m` : errorMessage,
            );
            return ExitCode.ContextLoadError;
        }
    } else {
        commandContext = context;
    }

    const hookStartExitCode = await runHook(app.integrations, "command:start", commandContext, {
        text,
        ansiColorByStream,
        result,
    });
    if (typeof hookStartExitCode === "number") {
        return hookStartExitCode;
    }

    const exitCode = await runCommand(result.target, {
        context: commandContext,
        inputs: result.unprocessedInputs,
        scannerConfig: app.config.scanner,
        errorFormatting: text,
        determineExitCode: app.config.determineExitCode,
        ansiColorByStream,
    });

    const hookEndExitCode = await runHook(app.integrations, "command:end", commandContext, {
        text,
        ansiColorByStream,
        result,
        exitCode,
    });
    if (typeof hookEndExitCode === "number") {
        return hookEndExitCode;
    }

    return exitCode;
}
