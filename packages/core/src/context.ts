// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

/**
 * Minimal expected interface for an output stream; used to narrow the types of NodeJS's stdout/stderr.
 */
export interface Writable {
    /**
     * Write the provided string to this stream.
     */
    readonly write: (str: string) => void;
    /**
     * Determine the available color depth of the underlying stream.
     * Environment variables are also provided to control or suppress color output.
     */
    readonly getColorDepth?: (env?: Readonly<Partial<Record<string, string>>>) => number;
}

interface WritableStreams {
    /**
     * Contains a writable stream connected to stdout (fd 1).
     */
    readonly stdout: Writable;
    /**
     * Contains a writable stream connected to stderr (fd 2).
     */
    readonly stderr: Writable;
}

/**
 * Command-level context that provides necessary process information and is available to all command runs.
 * This type should be extended to include context specific to your command implementations.
 */
export interface CommandContext {
    readonly process: WritableStreams;
}

/**
 * Simple interface that mirrors NodeJS.Process but only requires the minimum API required by Stricli.
 */
export interface StricliProcess extends WritableStreams {
    /**
     * Object that stores all available environment variables.
     *
     * @see {@link EnvironmentVariableName} for variable names used by Stricli.
     */
    readonly env?: Readonly<Partial<Record<string, string>>>;
    /**
     * A number which will be the process exit code.
     */
    exitCode?: number | string;
}

/**
 * Environment variable names used by Stricli.
 *
 * - `STRICLI_SKIP_VERSION_CHECK` - If specified and non-0, skips the latest version check.
 * - `STRICLI_NO_COLOR` - If specified and non-0, disables ANSI terminal coloring.
 */
export type EnvironmentVariableName = "STRICLI_SKIP_VERSION_CHECK" | "STRICLI_NO_COLOR";

/**
 * @internal
 */
export function checkEnvironmentVariable(process: StricliProcess, varName: EnvironmentVariableName): boolean {
    const value = process.env?.[varName];
    return typeof value === "string" && value !== "0";
}

/**
 * Top-level context that provides necessary process information to Stricli internals.
 */
export interface ApplicationContext extends CommandContext {
    readonly process: StricliProcess;
    /**
     * A string that represents the current user's locale.
     * It is passed to {@link LocalizationConfiguration.loadText} which provides the text for Stricli to use
     * when formatting built-in output.
     */
    readonly locale?: string;
}

/**
 * Contextual information about the current command.
 */
export interface CommandInfo {
    /**
     * Prefix of command line inputs used to navigate to the current command.
     */
    readonly prefix: readonly string[];
}
/**
 * Function to build a generic CommandContext given the current command information.
 */
export type StricliCommandContextBuilder<CONTEXT extends CommandContext> = (
    info: CommandInfo,
) => CONTEXT | Promise<CONTEXT>;

/**
 * Dynamic context for command that contains either the generic CommandContext or simply the more limited
 * ApplicationContext and a method that builds a specific instance of the generic CommandContext.
 */
export type StricliDynamicCommandContext<CONTEXT extends CommandContext> = ApplicationContext &
    (
        | CONTEXT
        | {
              /**
               * Method to build specific CommandContext instance for the current command.
               */
              readonly forCommand: StricliCommandContextBuilder<CONTEXT>;
          }
    );
