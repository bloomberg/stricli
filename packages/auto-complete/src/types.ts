// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { ApplicationContext, CompleteIntegrationConfiguration } from "@stricli/core";
import type { SystemDependencies } from "./cli/context";

export type ShellAutoCompleteCommandManager = {
    /**
     * Registers script for the given command in the shell.
     * Returns a message to display to the user, if any follow-up action is necessary.
     */
    readonly installScriptForCommand: (targetCommand: string, script: string) => Promise<string | undefined>;
    /**
     * Unregisters script for the given command in the shell.
     * Returns a message to display to the user, if any follow-up action is necessary.
     */
    readonly uninstallScriptForCommand: (targetCommand: string) => Promise<string | undefined>;
};

export type ShellAutoCompleteSupport = Pick<CompleteIntegrationConfiguration, "completeNextInput" | "handleCompletions"> & {
    /**
     * Returns true if the shell is the current shell, false otherwise.
     */
    readonly isCurrentShell: (context: ApplicationContext) => boolean;
    /**
     * Generates the script for the given command in the shell.
     * The script should be a string that can be executed in the shell to enable autocomplete support for the command.
     */
    readonly generateScript: (targetCommand: string, autocompleteCommand: string) => string;
    /**
     * Returns true if the script for the given command is active in the shell, false otherwise.
     * This function will only be called when completions have been requested, but is used to disambiguate which shell script is running.
     *
     * If not provided, will default to {@link isCurrentShell} and assume that the script is active if the shell is the current shell.
     */
    readonly isScriptActive?: (context: ApplicationContext) => boolean;
    /**
     * Returns a {@link ShellAutoCompleteCommandManager} for the shell.
     */
    readonly getCommandManager: (deps: Partial<SystemDependencies>) => Promise<ShellAutoCompleteCommandManager>;
};
