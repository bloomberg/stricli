// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import * as core from "@stricli/core";
import { TerminalHistoryLine } from "./Terminal";

export class ConsoleRedirectError extends Error {
    constructor(p: keyof Console) {
        const lines = [
            "Property not implemented...",
            "`console` access is being proxied to redirect output to pseudo-terminal.",
            `Unable to access "${String(p)}" in this playground.`,
            "See page about Isolated Context for more details.",
        ];
        super(lines.join("\n    "));
    }
    override stack = void 0;
}

type ConsoleLogLevel = "log" | "trace" | "debug" | "info" | "warn" | "error";
type ConsoleLogFunction = (...args: unknown[]) => void;

export class ConsoleRedirect {
    readonly #console: Console;
    readonly #redirects: Partial<Record<ConsoleLogLevel, ConsoleLogFunction>> = {};
    constructor() {
        this.#console = new Proxy(console, {
            get: (_target, p) => {
                if (p in this.#redirects) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return this.#redirects[p as keyof Console];
                }
                throw new ConsoleRedirectError(p as keyof Console);
            },
        });
    }
    get console(): Console {
        return this.#console;
    }
    redirect(method: ConsoleLogLevel, handler: ConsoleLogFunction) {
        this.#redirects[method] = handler;
    }
}

export type PlaygroundApp = core.Application<core.CommandContext> & {
    consoleRedirect?: ConsoleRedirect;
};

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

function processLogLine(args: unknown[]): string {
    return args
        .map((arg) => {
            if (typeof arg === "string") {
                return arg;
            }
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        })
        .join(" ");
}

export async function runApplication(
    app: PlaygroundApp,
    inputs: readonly string[],
): Promise<readonly TerminalHistoryLine[]> {
    const history: TerminalHistoryLine[] = [];
    if (app.consoleRedirect) {
        const logAsStdout = (...args: unknown[]) => {
            history.push([processLogLine(args), "stdout"]);
        };
        const logAsStderr = (...args: unknown[]) => {
            history.push([processLogLine(args), "stderr"]);
        };
        app.consoleRedirect.redirect("log", logAsStdout);
        app.consoleRedirect.redirect("info", logAsStdout);
        app.consoleRedirect.redirect("debug", logAsStdout);
        app.consoleRedirect.redirect("trace", logAsStdout);
        app.consoleRedirect.redirect("warn", logAsStderr);
        app.consoleRedirect.redirect("error", logAsStderr);
    }
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

export async function proposeCompletions(app: PlaygroundApp, inputs: readonly string[]): Promise<readonly string[]> {
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
