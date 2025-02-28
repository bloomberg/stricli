// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import * as core from "@stricli/core";
import { TerminalHistoryLine } from "./Terminal";

export function parseArgv(input: string): readonly string[] {
    const matches = input.match(/".*?"|[\S]+/g);
    if (!matches) {
        return [];
    }
    for (let i = 0; i < matches?.length; ++i) {
        matches[i] = matches[i].replace(/^"(.*)"$/, "$1");
    }
    return matches;
}

export async function runApplication(
    app: core.Application<core.CommandContext>,
    inputs: readonly string[],
): Promise<readonly TerminalHistoryLine[]> {
    const history: TerminalHistoryLine[] = [];
    await core.run(app, inputs, {
        process: {
            stdout: {
                write: (str) => history.push([str, "stdout"]),
                getColorDepth: () => 4,
            },
            stderr: {
                write: (str) => history.push([str, "stderr"]),
                getColorDepth: () => 4,
            },
        },
    });
    return history;
}

export async function proposeCompletions(
    app: core.Application<core.CommandContext>,
    inputs: readonly string[],
): Promise<readonly string[]> {
    const completions = await core.proposeCompletions(app, inputs, {
        process: {
            stdout: {
                write: (str) => {
                    console.log(str);
                },
            },
            stderr: {
                write: (str) => {
                    console.warn(str);
                },
            },
        },
    });
    return completions.map((completion) => completion.completion);
}
