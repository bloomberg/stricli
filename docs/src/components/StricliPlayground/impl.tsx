// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import React, { useCallback, useMemo, useRef, useState } from "react";

import Editor from "./Editor";
import Terminal, { TerminalHistoryLine } from "./Terminal";

// @ts-expect-error Import .d.ts file as text for playground
import StricliCoreTypes from "../../../../packages/core/dist/index.d.ts";

import * as core from "@stricli/core";

export interface StricliPlaygroundProps {
    title?: string;
    filename: string;
    children?: string;
    rootExport?: string;
    appName?: string;
    defaultInput?: string;
    collapsed?: boolean;
    editorHeight?: string;
    terminalHeight?: string;
}

function loadApplication(
    rawCode: string,
    rootExport?: string,
    appName?: string,
): core.Application<core.CommandContext> | undefined {
    const exports: { default?: core.Application<core.CommandContext> } = {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function require(mod: string) {
        if (mod === "@stricli/core") {
            return core;
        }
        throw new Error(`Unable to import "${mod}" in this context`);
    }
    let code: string;
    if (rootExport && appName) {
        code = `${rawCode}
    exports.default = require("@stricli/core").buildApplication(exports["${rootExport}"], {
        name: "${appName}"
    });`;
    } else {
        code = rawCode;
    }
    try {
        eval(code);
    } catch (exc) {
        console.error("Error evaluating JS code:", exc);
        return;
    }
    return exports.default;
}

function parseArgv(input: string): readonly string[] {
    const matches = input.match(/".*?"|[\S]+/g);
    if (!matches) {
        return [];
    }
    for (let i = 0; i < matches?.length; ++i) {
        matches[i] = matches[i].replace(/^"(.*)"$/, "$1");
    }
    return matches;
}

async function runApplication(
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

async function proposeCompletions(
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

export default function StricliPlayground({
    title = "Live Playground",
    filename,
    children,
    appName,
    rootExport,
    defaultInput,
    collapsed,
    editorHeight = "250px",
    terminalHeight = "250px",
}: StricliPlaygroundProps): React.JSX.Element {
    const appRef = useRef<core.Application<core.CommandContext> | undefined>(void 0);
    const [lastLoaded, setLastLoaded] = useState<Date | undefined>();

    const libraries = {
        "@stricli/core": StricliCoreTypes as unknown as string,
    };

    const onTextChange = useCallback(
        (value: string | undefined) => {
            if (value) {
                appRef.current = loadApplication(value, rootExport, appName);
                setLastLoaded(new Date());
            } else {
                appRef.current = void 0;
            }
        },
        [appRef],
    );

    const lastLoadedTimestamp = useMemo(() => {
        if (lastLoaded) {
            const time = lastLoaded.toLocaleTimeString();
            return (
                <span key="terminal-navbar-last-loaded" className="terminal-navbar-last-loaded">
                    App reloaded at {time}
                </span>
            );
        }
        <span key="terminal-navbar-last-loaded" className="terminal-navbar-last-loaded">
            App not loaded
        </span>;
    }, [lastLoaded]);

    return (
        <div className="stricli-playground">
            <h5>{title}</h5>
            <Editor
                key={filename}
                filename={filename}
                language="typescript"
                height={editorHeight}
                options={{
                    tabSize: 2,
                    lineNumbers: "off",
                    scrollBeyondLastLine: false,
                    folding: false,
                    bracketPairColorization: { enabled: false },
                }}
                libraries={libraries}
                compilerOptions={{
                    module: 1,
                    strict: true,
                }}
                defaultValue={children}
                onChange={onTextChange}
            ></Editor>
            <Terminal
                startCollapsed={collapsed}
                height={terminalHeight}
                commandPrefix={appName + " "}
                defaultValue={defaultInput}
                executeInput={async (input) => {
                    const app = appRef.current;
                    if (!app) {
                        return [["Application not loaded, check for type errors above ^", "stderr"]];
                    }
                    const argv = parseArgv(input);
                    if (argv[0] !== app.config.name) {
                        return [[`${argv[0]}: command not found`, "stderr"]];
                    }
                    return runApplication(app, argv.slice(1));
                }}
                completeInput={async (input) => {
                    const app = appRef.current;
                    if (!app) {
                        console.error("Application not loaded");
                        return [];
                    }
                    const argv = parseArgv(input);
                    if (argv[0] !== app.config.name) {
                        return [];
                    }
                    const inputs = argv.slice(1);
                    let finalInput = inputs.at(-1);
                    if (input.endsWith(" ")) {
                        finalInput = "";
                        inputs.push("");
                    }
                    const completions = await proposeCompletions(app, inputs);
                    if (finalInput === "") {
                        return completions.map((completion) => `${input}${completion}`);
                    }
                    const finalInputIndex = input.lastIndexOf(finalInput);
                    const inputWithoutFinal = input.slice(0, finalInputIndex);
                    return completions.map((completion) => `${inputWithoutFinal}${completion}`);
                }}
                additionalNavbarElements={[lastLoadedTimestamp]}
            ></Terminal>
        </div>
    );
}

// import { buildCommand, buildApplication } from "@stricli/core";

// const command = buildCommand({
//     loader: async () => {
//         return (flags: {}) => {};
//     },
//     parameters: {},
//     docs: {
//         brief: "command",
//     },
// });

// const app = buildApplication(command, {
//     name: "z"
// });
// export default app;

// import { buildCommand, buildApplication } from "@stricli/core";

// const command = buildCommand({
//     loader: async () => {
//         return function(flags: { name: string }) {
//             this.process.stdout.write(`Hello, ${flags.name}!`);
//         };
//     },
//     parameters: {
//         flags: {
//             name: {
//                 kind: "parsed",
//                 parse: String,
//                 brief: "Your name",
//             },
//         },
//     },
//     docs: {
//         brief: "command",
//     },
// });

// const app = buildApplication(command, {
//     name: "run"
// });
// export default app;
