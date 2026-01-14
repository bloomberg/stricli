// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { Application } from "@stricli/core";
import type { StricliAutoCompleteContext, SystemDependencies } from "./cli/context";

export type ShellAutoCompleteSupport = {
    readonly isShellActive: (context: StricliAutoCompleteContext) => Promise<boolean>;
    readonly getCommandManager: (deps: Partial<SystemDependencies>) => Promise<ShellAutoCompleteCommandManager>;
    readonly handleCompletions: <CONTEXT extends StricliAutoCompleteContext>(
        app: Application<CONTEXT>,
        inputs: string[],
        context: CONTEXT,
    ) => Promise<void>;
};

export type ShellAutoCompleteCommandManager = {
    /**
     *
     * @param targetCommand
     * @param autocompleteCommand
     * @returns Message for the end user with shell-specific instructions for any manual steps.
     */
    readonly install: (targetCommand: string, autocompleteCommand: string) => Promise<string | undefined>;
    /**
     *
     * @param targetCommand
     * @returns Message for the end user with shell-specific instructions for any manual steps.
     */
    readonly uninstall: (targetCommand: string) => Promise<string | undefined>;
};
