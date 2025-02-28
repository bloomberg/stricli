// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import React, { useCallback, useMemo, useRef, useState } from "react";

// import Editor from "./Editor";
import Terminal from "./Terminal";

// @ts-expect-error Import .d.ts file as text for playground
import StricliCoreTypes from "../../../../packages/core/dist/index.d.ts";

import * as core from "@stricli/core";
import TypeScriptPlayground, { EmittedFiles, TextFile } from "../TypeScriptPlayground/impl";
import { parseArgv, proposeCompletions, runApplication } from "./actions";
import { evaluateFiles } from "./eval";

export interface StricliPlaygroundProps {
    title?: string;
    children: string;
    collapsed?: boolean;
    editorHeight?: string;
    terminalHeight?: string;
}

function importCore(mod: string) {
    if (mod === "@stricli/core") {
        return core;
    }
    throw new Error(`Unable to import "${mod}" in this context`);
}

function parseChildrenAsFiles(text: string): [initialInputs: readonly string[], files: readonly TextFile[]] {
    const [preface, ...sections] = text.split("/// ");
    const initialInputs = preface
        .slice(0, -1)
        .split("\n")
        .map((line) => line.trim());
    const files = sections.map((section) => {
        const [fileName, ...lines] = section.split("\n");
        let name: string;
        let hidden = false;
        if (fileName.startsWith("!")) {
            name = fileName.slice(1);
            hidden = true;
        } else {
            name = fileName;
        }
        return {
            name,
            initialValue: lines.join("\n"),
            hidden,
            language: name.endsWith(".ts") ? "typescript" : void 0,
        };
    });
    return [initialInputs, files];
}

export default function StricliPlayground({
    title = "Live Playground",
    children,
    collapsed,
    editorHeight = "250px",
    terminalHeight = "250px",
}: StricliPlaygroundProps): React.JSX.Element {
    const appRef = useRef<core.Application<core.CommandContext> | undefined>(void 0);
    const [lastLoaded, setLastLoaded] = useState<Date | undefined>();
    const [appName, setAppName] = useState<string>("loading...");

    const id = useMemo(() => crypto.randomUUID(), []);
    const modelDirectory = `code_${id}`;

    const [initialInputs, files] = parseChildrenAsFiles(children);

    const libraries = {
        "@stricli/core": StricliCoreTypes as unknown as string,
    };

    const onWorkspaceChange = useCallback(
        (emittedFiles: EmittedFiles) => {
            if (Object.keys(emittedFiles).length > 0) {
                const exports = evaluateFiles(emittedFiles, `file:///${modelDirectory}/app.js`, importCore);
                if (exports) {
                    const app = exports.default as core.Application<core.CommandContext>;
                    appRef.current = app;
                    setLastLoaded(new Date());
                    setAppName(app.config.name);
                } else {
                    appRef.current = void 0;
                }
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
            <TypeScriptPlayground
                files={files}
                rootDirectory={modelDirectory}
                defaultHeight={editorHeight}
                libraries={libraries}
                compilerOptions={{
                    allowImportingTsExtensions: true,
                    module: 1,
                    strict: true,
                    typeRoots: ["node_modules/@types"],
                    types: ["@stricli/core"],
                }}
                onEmit={onWorkspaceChange}
            ></TypeScriptPlayground>
            <Terminal
                appLoaded={Boolean(appRef.current)}
                startCollapsed={collapsed}
                height={terminalHeight}
                commandPrefix={appName}
                initialInputs={initialInputs.slice(0, -1)}
                defaultValue={initialInputs.at(-1)}
                executeInput={async (input) => {
                    const app = appRef.current;
                    if (!app) {
                        return [["Application not loaded, check for type errors above ^", "stderr"]];
                    }
                    const argv = parseArgv(input);
                    const lines = await runApplication(app, argv);
                    return [...lines, [input, "stdin", app.config.name]];
                }}
                completeInput={async (input) => {
                    const app = appRef.current;
                    if (!app) {
                        console.error("Application not loaded");
                        return [];
                    }
                    const argv = [...parseArgv(input)];
                    let finalInput = argv.at(-1);
                    if (input.endsWith(" ")) {
                        finalInput = "";
                        argv.push("");
                    }
                    const completions = await proposeCompletions(app, argv);
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
