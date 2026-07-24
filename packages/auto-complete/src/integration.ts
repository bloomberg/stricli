import { complete, type CommandContext, type CompleteIntegrationConfiguration, type StricliIntegration } from "@stricli/core";
import { shells } from "./shells";
import type { ShellAutoCompleteSupport } from "./types";

export function integration<CONTEXT extends CommandContext>(config: Omit<CompleteIntegrationConfiguration, "completeNextInput" | "handleCompletions">): StricliIntegration<CONTEXT> {
    return complete({
        ...config,
        completeNextInput(...args) {
            const shell = Object.values(shells).find((support) => support.isScriptActive(this)) as ShellAutoCompleteSupport | undefined;
            return shell?.completeNextInput?.call(this, ...args) ?? false;
        },
        handleCompletions(...args) {
            const shell = Object.values(shells).find((support) => support.isScriptActive(this)) as ShellAutoCompleteSupport | undefined;
            shell?.handleCompletions.call(this, ...args);
        },
    });
}
