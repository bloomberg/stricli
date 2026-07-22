// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CompletionConfiguration } from "../../config";
import type { ApplicationContext, CommandContext } from "../../context";
import type { AdditionalFlag } from "../../routing/scanner";
import type { StricliIntegration } from "../integration";
import { proposeCompletionsForApplication, type InputCompletion } from "../propose-completions";

/**
 * Options for customizing the behavior of the `complete` integration.
 */
export type CompleteIntegrationConfiguration = Pick<AdditionalFlag, "brief" | "hidden"> &
    CompletionConfiguration & {
        /**
         * Stricli will always consider the final string in the `inputs` array to be a partial input for which completions should be proposed.
         * In cases where the user has finished one input and is about to start another, shells may not add empty strings to the end of the input (argv) array.
         * This function can be used to indicate that the final input should be treated as complete, and a new empty input should be added to the end of the array.
         *
         * For example, the difference between the user typing `cli root<TAB>` and `cli root <TAB>` is whether to propose completions for `root*` or the next input *after* `root`.
         * In both of these cases, the shell may invoke the application with the same argv array, and this function can use environment variables or other heuristics to distinguish between the two cases.
         */
        readonly completeNextInput?: (this: ApplicationContext, inputs: readonly string[]) => boolean;
        /**
         * This function will be called with the proposed completions for the partial input.
         * It is the responsibility of this function to handle the completions appropriately, in the context of whatever is
         * invoking the application with the `--complete` flag. It should print the completions to stdout, or otherwise
         * handle them in a way that the shell can present them to the user.
         */
        readonly handleCompletions: (this: ApplicationContext, completions: readonly InputCompletion[]) => void;
    };

/**
 * This integration provides a `--complete` flag on the root command, which accepts partial inputs after the flag.
 * Users should not call this flag directly, but when combined with a shell completion script, it can be used to
 * propose completions for the application.
 */
export function complete<CONTEXT extends CommandContext>({
    completeNextInput,
    handleCompletions,
    ...config
}: CompleteIntegrationConfiguration): StricliIntegration<CONTEXT> {
    return {
        flag: {
            brief: config.brief,
            hidden: config.hidden ?? true,
            defaultForRouteMap: false,
            global: false,
            complete: false,
            async run(this, app, args) {
                // The first input is expected to be the bin name that invoked the application, and it isn't used for routing so we drop it.
                const inputs = args.result.unprocessedInputs.slice(1);
                if (completeNextInput?.call(this, inputs)) {
                    inputs.push("");
                }
                const completions = await proposeCompletionsForApplication({
                    root: app.root,
                    integrations: app.integrations,
                    scannerConfig: app.config.scanner,
                    completionConfig: config,
                    text: args.text,
                    inputs,
                    context: this,
                });
                handleCompletions.call(this, completions);
            },
        },
    };
}
