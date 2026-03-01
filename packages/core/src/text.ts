// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DocumentationConfiguration } from "./config";
import { checkEnvironmentVariable, type StricliProcess, type Writable } from "./context";
import { ArgumentScannerError, formatMessageForArgumentScannerError } from "./parameter/scanner";
import { formatException } from "./util/error";
import { joinWithGrammar } from "./util/formatting";

/**
 * Keyword strings used to build help text.
 */
export interface DocumentationKeywords {
    /**
     * Keyword to be included when flags or arguments have a default value.
     *
     * Defaults to `"default ="`.
     */
    readonly default: string;
    /**
     * Keyword to be included when flags are variadic and have a defined separator.
     *
     * Defaults to `"separator ="`.
     */
    readonly separator: string;
}

/**
 * Section header strings used to build help text.
 */
export interface DocumentationHeaders {
    /**
     * Header for help text section that lists all usage lines.
     *
     * Defaults to `"USAGE"`.
     */
    readonly usage: string;
    /**
     * Header for help text section that lists all aliases for the route.
     *
     * Defaults to `"ALIASES"`.
     */
    readonly aliases: string;
    /**
     * Header for help text section that lists all commands in a route map.
     *
     * Defaults to `"COMMANDS"`.
     */
    readonly commands: string;
    /**
     * Header for help text section that lists all flags accepted by the route.
     *
     * Defaults to `"FLAGS"`.
     */
    readonly flags: string;
    /**
     * Header for help text section that lists all arguments accepted by the command.
     *
     * Defaults to `"ARGUMENTS"`.
     */
    readonly arguments: string;
}

/**
 * Short documentation brief strings used to build help text.
 */
export interface DocumentationBriefs {
    /**
     * Documentation brief to be included alongside `--help` flag in help text.
     *
     * Defaults to `"Print help information and exit"`.
     */
    readonly help: string;
    /**
     * Documentation brief to be included alongside `--helpAll` flag in help text.
     *
     * Defaults to `"Print help information (including hidden commands/flags) and exit"`.
     */
    readonly helpAll: string;
    /**
     * Documentation brief to be included alongside `--version` flag in help text.
     *
     * Defaults to `"Print version information and exit"`.
     */
    readonly version: string;
    /**
     * Documentation brief to be included alongside `--` escape sequence in help text.
     * Only present when `scanner.allowArgumentEscapeSequence` is `true`.
     *
     * Defaults to `"All subsequent inputs should be interpreted as arguments"`.
     */
    readonly argumentEscapeSequence: string;
}

/**
 * Strings used to build help text.
 */
export interface DocumentationText {
    /**
     * Keyword strings used to build help text.
     */
    readonly keywords: DocumentationKeywords;
    /**
     * Section header strings used to build help text.
     */
    readonly headers: DocumentationHeaders;
    /**
     * Short documentation brief strings used to build help text.
     */
    readonly briefs: DocumentationBriefs;
}

/**
 * Methods to customize the formatting of thrown exceptions.
 */
export interface ExceptionFormatting {
    /**
     * Formatted message to display this thrown exception in the terminal.
     * The default behavior returns the `stack` property if the object extends from `Error`, and otherwise calls `String()`.
     *
     * This method should never throw and should not include any ANSI terminal codes in the resulting string.
     */
    readonly formatException?: (exc: unknown) => string;
}

/**
 * Methods to customize the formatting of stderr messages handled by command execution.
 */
export interface CommandErrorFormatting extends ExceptionFormatting {
    /**
     * Formatted error message for the case where some exception was thrown while parsing the arguments.
     *
     * Exceptions intentionally thrown by this library while parsing arguments will extend from ArgumentScannerError.
     * These subclasses provide additional context about the specific error.
     * Use the {@link formatMessageForArgumentScannerError} helper to handle the different error types.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly exceptionWhileParsingArguments: (this: ExceptionFormatting, exc: unknown, ansiColor: boolean) => string;
    /**
     * Formatted error message for the case where some exception was thrown while loading the command function.
     * This likely indicates an issue with the application itself or possibly the user's installation of the application.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly exceptionWhileLoadingCommandFunction: (
        this: ExceptionFormatting,
        exc: unknown,
        ansiColor: boolean,
    ) => string;
    /**
     * Formatted error message for the case where some exception was thrown while loading the context for the command run.
     * This likely indicates an issue with the application itself or possibly the user's installation of the application.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly exceptionWhileLoadingCommandContext: (
        this: ExceptionFormatting,
        exc: unknown,
        ansiColor: boolean,
    ) => string;
    /**
     * Formatted error message for the case where some exception was thrown while running the command.
     * Users are most likely to hit this case, so make sure that the error text provides practical, usable feedback.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly exceptionWhileRunningCommand: (this: ExceptionFormatting, exc: unknown, ansiColor: boolean) => string;
    /**
     * Formatted error message for the case where an Error was safely returned from the command.
     * Users are most likely to hit this case, so make sure that the error text provides practical, usable feedback.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly commandErrorResult: (this: ExceptionFormatting, err: Error, ansiColor: boolean) => string;
}

/**
 * Methods to customize the formatting of stderr messages handled by application execution.
 */
export interface ApplicationErrorFormatting extends CommandErrorFormatting {
    /**
     * Formatted error message for the case where the supplied command line inputs do not resolve to a registered command.
     * Supplied with arguments for the argument in question, and several possible corrections based on registered commands.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly noCommandRegisteredForInput: (args: {
        readonly input: string;
        readonly corrections: readonly string[];
        readonly ansiColor: boolean;
    }) => string;
    /**
     * Formatted error message for the case where the application does not provide text for the current requested locale.
     * Should indicate that the default locale will be used instead.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly noTextAvailableForLocale: (args: {
        readonly requestedLocale: string;
        readonly defaultLocale: string;
        readonly ansiColor: boolean;
    }) => string;
}

/**
 * The full set of static text and text-returning callbacks that are necessary for Stricli to write the necessary output.
 */
export interface ApplicationText extends ApplicationErrorFormatting, DocumentationText {
    /**
     * Generate warning text to be written to stdout when the latest version is not installed.
     * Should include brief instructions for how to update to that version.
     *
     * If `ansiColor` is true, this string can use ANSI terminal codes.
     * Codes may have already been applied so be aware you may have to reset to achieve the desired output.
     */
    readonly currentVersionIsNotLatest: (args: {
        readonly currentVersion: string;
        readonly latestVersion: string;
        readonly upgradeCommand?: string;
        readonly ansiColor: boolean;
    }) => string;
}

/**
 * Default English text implementation of {@link ApplicationText}.
 */
export const text_en: ApplicationText = {
    headers: {
        usage: "USAGE",
        aliases: "ALIASES",
        commands: "COMMANDS",
        flags: "FLAGS",
        arguments: "ARGUMENTS",
    },
    keywords: {
        default: "default =",
        separator: "separator =",
    },
    briefs: {
        help: "Print help information and exit",
        helpAll: "Print help information (including hidden commands/flags) and exit",
        version: "Print version information and exit",
        argumentEscapeSequence: "All subsequent inputs should be interpreted as arguments",
    },
    noCommandRegisteredForInput({ input, corrections }) {
        const errorMessage = `No command registered for \`${input}\``;
        if (corrections.length > 0) {
            const formattedCorrections = joinWithGrammar(corrections, {
                kind: "conjunctive",
                conjunction: "or",
                serialComma: true,
            });
            return `${errorMessage}, did you mean ${formattedCorrections}?`;
        } else {
            return errorMessage;
        }
    },
    noTextAvailableForLocale({ requestedLocale, defaultLocale }) {
        return `Application does not support "${requestedLocale}" locale, defaulting to "${defaultLocale}"`;
    },
    exceptionWhileParsingArguments(exc) {
        if (exc instanceof ArgumentScannerError) {
            return formatMessageForArgumentScannerError(exc, {});
        }
        return `Unable to parse arguments, ${(this.formatException ?? formatException)(exc)}`;
    },
    exceptionWhileLoadingCommandFunction(exc) {
        return `Unable to load command function, ${(this.formatException ?? formatException)(exc)}`;
    },
    exceptionWhileLoadingCommandContext(exc) {
        return `Unable to load command context, ${(this.formatException ?? formatException)(exc)}`;
    },
    exceptionWhileRunningCommand(exc) {
        return `Command failed, ${(this.formatException ?? formatException)(exc)}`;
    },
    commandErrorResult(err) {
        return err.message;
    },
    currentVersionIsNotLatest({ currentVersion, latestVersion, upgradeCommand }) {
        if (upgradeCommand) {
            return `Latest available version is ${latestVersion} (currently running ${currentVersion}), upgrade with "${upgradeCommand}"`;
        }
        return `Latest available version is ${latestVersion} (currently running ${currentVersion})`;
    },
};

export function defaultTextLoader(locale: string): ApplicationText | undefined {
    if (locale.startsWith("en")) {
        return text_en;
    }
}

export function shouldUseAnsiColor(
    process: StricliProcess,
    stream: Writable,
    config: DocumentationConfiguration,
): boolean {
    return (
        !config.disableAnsiColor &&
        !checkEnvironmentVariable(process, "STRICLI_NO_COLOR") &&
        (stream.getColorDepth?.(process.env) ?? 1) >= 4
    );
}
