// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DocumentationConfiguration, ScannerConfiguration } from "../../config";
import { shouldUseAnsiColor, type CommandErrorFormatting } from "../../text";
import type { CommandContext } from "../../context";
import { ExitCode } from "../../exit-code";
import { buildArgumentScanner, type ParsedArguments } from "../../parameter/scanner";
import type { Command, CommandFunction } from "./types";
import type { BaseFlags } from "../../parameter/types";
import type { BaseArgs } from "../../parameter/positional/types";

export interface CommandRunArguments<CONTEXT extends CommandContext> {
    readonly context: CONTEXT;
    readonly inputs: readonly string[];
    readonly errorFormatting: CommandErrorFormatting;
    readonly scannerConfig: ScannerConfiguration;
    readonly documentationConfig: DocumentationConfiguration;
    readonly determineExitCode?: (exc: unknown) => number;
}

export async function runCommand<CONTEXT extends CommandContext>(
    { loader, parameters }: Command<CONTEXT>,
    {
        context,
        inputs,
        scannerConfig,
        errorFormatting,
        documentationConfig,
        determineExitCode,
    }: CommandRunArguments<CONTEXT>,
): Promise<number> {
    let parsedArguments: ParsedArguments<BaseFlags, BaseArgs>;
    try {
        const scanner = buildArgumentScanner(parameters, scannerConfig);
        for (const input of inputs) {
            scanner.next(input);
        }
        const result = await scanner.parseArguments(context);
        if (result.success) {
            parsedArguments = result.arguments;
        } else {
            const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, documentationConfig);
            for (const error of result.errors) {
                const errorMessage = errorFormatting.exceptionWhileParsingArguments(error, ansiColor);
                context.process.stderr.write(
                    ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
                );
            }
            return ExitCode.InvalidArgument;
        }
    } catch (exc) {
        const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, documentationConfig);
        const errorMessage = errorFormatting.exceptionWhileParsingArguments(exc, ansiColor);
        context.process.stderr.write(
            ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
        );
        return ExitCode.InvalidArgument;
    }

    let commandFunction: CommandFunction<BaseFlags, BaseArgs, CONTEXT>;
    try {
        const loaded = await loader();
        if (typeof loaded === "function") {
            commandFunction = loaded;
        } else {
            commandFunction = loaded.default;
        }
    } catch (exc) {
        const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, documentationConfig);
        const errorMessage = errorFormatting.exceptionWhileLoadingCommandFunction(exc, ansiColor);
        context.process.stderr.write(
            ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
        );
        return ExitCode.CommandLoadError;
    }

    try {
        const result = await commandFunction.call(context, ...parsedArguments);
        if (result instanceof Error) {
            const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, documentationConfig);
            const errorMessage = errorFormatting.commandErrorResult(result, ansiColor);
            context.process.stderr.write(
                ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
            );
            if (determineExitCode) {
                return determineExitCode(result);
            }
            return ExitCode.CommandRunError;
        }
    } catch (exc) {
        const ansiColor = shouldUseAnsiColor(context.process, context.process.stderr, documentationConfig);
        const errorMessage = errorFormatting.exceptionWhileRunningCommand(exc, ansiColor);
        context.process.stderr.write(
            ansiColor ? `\x1B[1m\x1B[31m${errorMessage}\x1B[39m\x1B[22m\n` : `${errorMessage}\n`,
        );
        if (determineExitCode) {
            return determineExitCode(exc);
        }
        return ExitCode.CommandRunError;
    }

    return ExitCode.Success;
}
