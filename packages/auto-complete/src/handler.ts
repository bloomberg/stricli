// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { Application } from "@stricli/core";
import type { StricliAutoCompleteContext } from "./cli/context";
import shells from "./shells";
import type { Shell } from "./types";

export function handleCompletionsForShell<CONTEXT extends StricliAutoCompleteContext>(
    shell: Shell,
    app: Application<CONTEXT>,
    inputs: string[],
    context: CONTEXT,
): Promise<void> {
    const support = shells[shell];
    return support.handleCompletions(app, inputs, context);
}
