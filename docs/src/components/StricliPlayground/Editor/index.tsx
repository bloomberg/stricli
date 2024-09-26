// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

// Adapted from monaco-react/src/Editor/Editor.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import loader from "@monaco-editor/loader";
// import useMount from '../hooks/useMount';
// import useUpdate from '../hooks/useUpdate';
// import usePrevious from '../hooks/usePrevious';
import type { IDisposable, editor, languages } from "monaco-editor";
// import { noop, getOrCreateModel } from '../utils';
// import { type EditorProps } from './types';

type Monaco = typeof import("monaco-editor/esm/vs/editor/editor.api");

import * as lightTheme from "./themes/light.json";
import * as darkTheme from "./themes/dark.json";

import ts from "typescript";

import { Sandbox, createTypeScriptSandbox } from "@typescript/sandbox";
import type * as upstream from "@monaco-editor/react";
import { usePrevious, useMount, useUpdate } from "../hooks";
import MonacoContainer from "./MonacoContainer";
import { useColorMode, ColorMode } from "@docusaurus/theme-common";
import IconArrow from "@theme/Icon/Arrow";

function noop() {
    /** no-op */
}

function createModelUri(monaco: Monaco, path: string) {
    return monaco.Uri.parse(path);
}

function getModel(monaco: Monaco, path: string) {
    return monaco.editor.getModel(createModelUri(monaco, path));
}

function createModel(monaco: Monaco, value: string, language?: string, path?: string) {
    return monaco.editor.createModel(value, language, path ? createModelUri(monaco, path) : undefined);
}

function getOrCreateModel(monaco: Monaco, value: string, language: string, path: string) {
    return getModel(monaco, path) || createModel(monaco, value, language, path);
}

function defineThemes(monaco: Monaco) {
    monaco.editor.defineTheme("light", lightTheme);
    monaco.editor.defineTheme("dark", darkTheme);
}

function asMonacoTheme(colorMode: ColorMode): string {
    return colorMode === "dark" ? "dark" : "light";
}

const viewStates = new Map<string, editor.ICodeEditorViewState | null>();

type EditorProps = upstream.EditorProps & {
    filename: string;
    compilerOptions?: languages.typescript.CompilerOptions;
    libraries?: Record<string, string>;
};

export default function Editor({
    defaultValue,
    defaultLanguage,
    defaultPath,
    value,
    language,
    path,
    /* === */
    line,
    loading = "Loading...",
    options = {},
    overrideServices = {},
    saveViewState = true,
    keepCurrentModel = false,
    /* === */
    width = "100%",
    height: defaultHeight = "100%",
    className,
    wrapperProps = {},
    /* === */
    beforeMount = noop,
    onMount = noop,
    onChange,
    onValidate = noop,
    /* === */
    filename,
    compilerOptions = {},
    libraries = {},
}: EditorProps) {
    const [collapsed, setCollapsed] = useState<boolean>(true);

    const [isEditorReady, setIsEditorReady] = useState(false);
    const [isMonacoMounting, setIsMonacoMounting] = useState(true);
    const monacoRef = useRef<Monaco | null>(null);
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const sandboxRef = useRef<Sandbox | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const onMountRef = useRef(onMount);
    const beforeMountRef = useRef(beforeMount);
    const subscriptionRef = useRef<IDisposable>();
    const valueRef = useRef(value);
    const previousPath = usePrevious(path);
    const preventCreation = useRef(false);
    const preventTriggerChangeEvent = useRef<boolean>(false);
    const { colorMode } = useColorMode();

    useMount(() => {
        loader.config({
            paths: {
                vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.51.0/min/vs",
            },
        });
        const cancelable = loader.init();

        cancelable
            .then((monaco) => {
                defineThemes(monaco);
                for (const [lib, text] of Object.entries(libraries)) {
                    monaco.languages.typescript.typescriptDefaults.addExtraLib(
                        text,
                        `file:///node_modules/${lib}/index.d.ts`,
                    );
                }
                monacoRef.current = monaco;
                if (monaco) {
                    setIsMonacoMounting(false);
                }
            })
            .catch((error: unknown) => {
                if (typeof error === "object" && error && "type" in error && error.type !== "cancelation") {
                    console.error("Monaco initialization: error:", error);
                }
            });

        return () => {
            if (editorRef.current) {
                disposeEditor();
            } else {
                cancelable.cancel();
            }
        };
    });

    useUpdate(
        () => {
            const model = getOrCreateModel(
                monacoRef.current,
                defaultValue || value || "",
                defaultLanguage || language || "",
                path || defaultPath || "",
            );

            if (model !== editorRef.current?.getModel()) {
                if (saveViewState) viewStates.set(previousPath, editorRef.current?.saveViewState());
                editorRef.current?.setModel(model);
                if (saveViewState) editorRef.current?.restoreViewState(viewStates.get(path));
            }
        },
        [path],
        isEditorReady,
    );

    useUpdate(
        () => {
            editorRef.current?.updateOptions(options);
        },
        [options],
        isEditorReady,
    );

    useUpdate(
        () => {
            if (!editorRef.current || value === undefined) return;
            if (editorRef.current.getOption(monacoRef.current.editor.EditorOption.readOnly)) {
                editorRef.current.setValue(value);
            } else if (value !== editorRef.current.getValue()) {
                preventTriggerChangeEvent.current = true;
                editorRef.current.executeEdits("", [
                    {
                        range: editorRef.current.getModel().getFullModelRange(),
                        text: value,
                        forceMoveMarkers: true,
                    },
                ]);

                editorRef.current.pushUndoStop();
                preventTriggerChangeEvent.current = false;
            }
        },
        [value],
        isEditorReady,
    );

    useUpdate(
        () => {
            const model = editorRef.current?.getModel();
            if (model && language) monacoRef.current?.editor.setModelLanguage(model, language);
        },
        [language],
        isEditorReady,
    );

    useUpdate(
        () => {
            // reason for undefined check: https://github.com/suren-atoyan/monaco-react/pull/188
            if (line !== undefined) {
                editorRef.current?.revealLine(line);
            }
        },
        [line],
        isEditorReady,
    );

    useUpdate(
        () => {
            monacoRef.current?.editor.setTheme(asMonacoTheme(colorMode));
        },
        [colorMode],
        isEditorReady,
    );

    const createEditor = useCallback(() => {
        if (!containerRef.current || !monacoRef.current) return;
        if (!preventCreation.current) {
            beforeMountRef.current(monacoRef.current);
            const autoCreatedModelPath = path || defaultPath;

            // containerRef.current.id = `monaco-container-${filename}`;
            const tsSandbox = createTypeScriptSandbox(
                {
                    // domID: containerRef.current.id,
                    elementToAppend: containerRef.current,
                    text: defaultValue,
                    monacoSettings: {
                        // model: defaultModel,
                        automaticLayout: true,
                        fontFamily: "JetBrains Mono",
                        fontSize: 12,
                        readOnly: false,
                        ...options,
                    },
                    compilerOptions: {
                        ...compilerOptions,
                        types: ["@stricli/core"],
                    },
                    acquireTypes: false,
                    // @ts-expect-error Misuse filetype to fix issue with overlaping models
                    filetype: `${filename}.ts`,
                    // logger: {
                    //     log: () => {},
                    //     error: () => {},
                    //     groupCollapsed: () => {},
                    //     groupEnd: () => {},
                    // },
                    logger: console,
                },
                monacoRef.current,
                ts,
            );
            console.log(tsSandbox);
            sandboxRef.current = tsSandbox;
            editorRef.current = tsSandbox.editor;

            // for (const [lib, text] of Object.entries(libraries)) {
            //     tsSandbox.addLibraryToRuntime(text, `/node_modules/${lib}/index.d.ts`);
            // }

            if (saveViewState) {
                editorRef.current.restoreViewState(viewStates.get(autoCreatedModelPath));
            }

            monacoRef.current.editor.setTheme(asMonacoTheme(colorMode));

            setIsEditorReady(true);
            preventCreation.current = true;
        }
    }, [
        defaultValue,
        defaultLanguage,
        defaultPath,
        value,
        language,
        path,
        options,
        overrideServices,
        saveViewState,
        colorMode,
    ]);

    useEffect(() => {
        if (isEditorReady) {
            onMountRef.current(editorRef.current, monacoRef.current);
            if (defaultValue && onChange) {
                void sandboxRef.current?.getRunnableJS().then(
                    (value) => {
                        onChange(value, void 0 as editor.IModelContentChangedEvent);
                    },
                    (exc: unknown) => {
                        console.warn("something went wrong in getRunnableJS", filename, exc);
                    },
                );
            }
        }
    }, [isEditorReady]);

    useEffect(() => {
        if (!isMonacoMounting && !isEditorReady) {
            createEditor();
        }
    }, [isMonacoMounting, isEditorReady, createEditor]);

    // subscription
    // to avoid unnecessary updates (attach - dispose listener) in subscription
    valueRef.current = value;

    // onChange
    useEffect(() => {
        if (isEditorReady && onChange) {
            subscriptionRef.current?.dispose();
            subscriptionRef.current = editorRef.current?.onDidChangeModelContent((event) => {
                if (!preventTriggerChangeEvent.current) {
                    void sandboxRef.current?.getRunnableJS().then((value) => {
                        onChange(value, event);
                    });
                }
            });
        }
    }, [isEditorReady, onChange]);

    // onValidate
    useEffect(() => {
        if (isEditorReady) {
            const changeMarkersListener = monacoRef.current.editor.onDidChangeMarkers((uris) => {
                const editorUri = editorRef.current.getModel()?.uri;

                if (editorUri) {
                    const currentEditorHasMarkerChanges = uris.find((uri) => uri.path === editorUri.path);
                    if (currentEditorHasMarkerChanges) {
                        const markers = monacoRef.current.editor.getModelMarkers({
                            resource: editorUri,
                        });
                        onValidate?.(markers);
                    }
                }
            });

            return () => {
                changeMarkersListener?.dispose();
            };
        }
        return () => {
            // eslint happy
        };
    }, [isEditorReady, onValidate]);

    function disposeEditor() {
        subscriptionRef.current?.dispose();

        if (keepCurrentModel) {
            if (saveViewState) {
                viewStates.set(path, editorRef.current.saveViewState());
            }
        } else {
            editorRef.current.getModel()?.dispose();
        }

        editorRef.current.dispose();
    }

    const toggleHeight = useCallback(() => {
        setCollapsed(!collapsed);
    }, [collapsed]);

    const height = collapsed ? defaultHeight : `calc(${defaultHeight} * 2)`;

    return (
        <div class="editor-container">
            <div class="editor-navbar">
                <button class="editor-navbar-button" key="editor-navbar-toggle" onClick={toggleHeight}>
                    {/* {collapsed ? "Expand" : "Collapse"} */}
                    <IconArrow style={{ transform: collapsed ? "rotate(90deg)" : "rotate(-90deg)" }} />
                </button>
            </div>
            <MonacoContainer
                width={width}
                height={height}
                isEditorReady={isEditorReady}
                loading={loading}
                _ref={containerRef}
                className={className}
                wrapperProps={wrapperProps}
            />
        </div>
    );
}
