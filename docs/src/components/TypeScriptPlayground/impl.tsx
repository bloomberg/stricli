// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { ColorMode, useColorMode } from "@docusaurus/theme-common";
import { Editor, EditorProps, OnChange, OnMount } from "@monaco-editor/react";
import IconArrow from "@theme/Icon/Arrow";
import clsx from "clsx";
import type { editor, typescript, Uri } from "monaco-editor";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Monaco = typeof import("monaco-editor");

import * as darkTheme from "./themes/dark.json";
import * as lightTheme from "./themes/light.json";

import styles from "./styles.module.css";

export type TextFile = {
    readonly name: string;
    readonly initialValue: string;
    readonly language?: string;
    readonly hidden?: boolean;
};

export type Libraries = Readonly<Record<string, string>>;

export type EmittedFiles = Readonly<Record<string, string>>;

export type OnEmit = (emittedFiles: EmittedFiles) => void;

export type TypeScriptPlaygroundProps = {
    readonly files: readonly TextFile[];
    readonly rootDirectory: string;
    readonly libraries?: Libraries;
    readonly compilerOptions?: typescript.CompilerOptions;
    readonly editorProps?: Omit<EditorProps, "height">;
    readonly defaultHeight?: string;
    readonly onEmit?: OnEmit;
};

function defineThemes(monaco: Monaco) {
    monaco.editor.defineTheme("light", lightTheme as editor.IStandaloneThemeData);
    monaco.editor.defineTheme("dark", darkTheme as editor.IStandaloneThemeData);
}

function asMonacoTheme(colorMode: ColorMode): string {
    return colorMode === "dark" ? "dark" : "light";
}

export default function TypeScriptPlayground({
    files,
    rootDirectory,
    libraries = {},
    compilerOptions,
    editorProps,
    defaultHeight = "250px",
    onEmit,
}: TypeScriptPlaygroundProps): React.JSX.Element {
    // Monaco setup
    const editorRef = useRef<editor.IStandaloneCodeEditor>();
    const monacoRef = useRef<Monaco>();
    const tsRef = useRef<typescript.TypeScriptWorker>();
    const [isEditorReady, setIsEditorReady] = useState(false);

    const [collapsed, setCollapsed] = useState<boolean>(true);

    const [activeFileName, setActiveFileName] = useState(files[0].name);

    const [emittedFiles, setEmittedFiles] = useState<Record<string, string>>({});

    const switchToNextFile = useCallback(() => {
        setActiveFileName((active) => {
            const visibleFiles = files.filter((file) => !file.hidden);
            const index = visibleFiles.findIndex((file) => file.name === active);
            const nextIndex = (index + 1) % visibleFiles.length;
            return visibleFiles[nextIndex].name;
        });
    }, [files]);

    const switchToPreviousFile = useCallback(() => {
        setActiveFileName((active) => {
            const visibleFiles = files.filter((file) => !file.hidden);
            const index = visibleFiles.findIndex((file) => file.name === active);
            const previousIndex = (visibleFiles.length + index - 1) % visibleFiles.length;
            return visibleFiles[previousIndex].name;
        });
    }, [files]);

    const expandEditor = useCallback(() => {
        setCollapsed(false);
    }, []);

    const collapseEditor = useCallback(() => {
        setCollapsed(true);
    }, []);

    const { colorMode } = useColorMode();

    const afterMount = useCallback<OnMount>(
        (editor, monaco: Monaco) => {
            console.log("afterMount");
            editorRef.current = editor;
            monacoRef.current = monaco;
            const uris: Uri[] = [];
            for (const file of files) {
                const uri = monaco.Uri.parse(`file:///${rootDirectory}/${file.name}`);
                monaco.editor.createModel(file.initialValue, file.language, uri);
                uris.push(uri);
            }
            editor.addAction({
                id: "switchToNextFile",
                label: "Switch to Next File",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.RightArrow],
                run: switchToNextFile,
            });
            editor.addAction({
                id: "switchToPreviousFile",
                label: "Switch to Previous File",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.LeftArrow],
                run: switchToPreviousFile,
            });
            editor.addAction({
                id: "expandEditor",
                label: "Switch to Next File",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.DownArrow],
                run: expandEditor,
            });
            editor.addAction({
                id: "collapseEditor",
                label: "Switch to Previous File",
                keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.UpArrow],
                run: collapseEditor,
            });
            for (const [packageName, content] of Object.entries(libraries)) {
                monaco.typescript.typescriptDefaults.addExtraLib(
                    content,
                    `node_modules/@types/${packageName}/index.d.ts`,
                );
            }
            monaco.typescript.typescriptDefaults.setEagerModelSync(true);
            monaco.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
            defineThemes(monaco);
            monaco.editor.setTheme(asMonacoTheme(colorMode));
            setIsEditorReady(true);
            void monaco.typescript.getTypeScriptWorker().then(async (getWorker) => {
                const worker = await getWorker(...uris);
                tsRef.current = worker;
                const outputs = await Promise.all(uris.map((uri) => worker.getEmitOutput(uri.toString())));
                const outputFiles = outputs.flatMap((output) => output.outputFiles);
                const newData = Object.fromEntries(outputFiles.map((file) => [file.name, file.text]));
                onEmit?.(newData);
                setEmittedFiles({ ...emittedFiles, ...newData });
            });
        },
        [
            colorMode,
            compilerOptions,
            emittedFiles,
            files,
            switchToNextFile,
            switchToPreviousFile,
            expandEditor,
            collapseEditor,
            libraries,
            onEmit,
            rootDirectory,
        ],
    );

    useEffect(() => {
        onEmit?.(emittedFiles);
    }, [isEditorReady, onEmit, emittedFiles]);

    // File Switching

    const onChange = useCallback<OnChange>(() => {
        void tsRef.current.getEmitOutput(`file:///${rootDirectory}/${activeFileName}`).then((output) => {
            const newData = Object.fromEntries(output.outputFiles.map((file) => [file.name, file.text]));
            setEmittedFiles({ ...emittedFiles, ...newData });
        });
    }, [tsRef, rootDirectory, activeFileName, emittedFiles]);

    useEffect(() => {
        if (isEditorReady) {
            const activeUri = monacoRef.current.Uri.parse(`file:///${rootDirectory}/${activeFileName}`);
            const model = monacoRef.current.editor.getModel(activeUri);
            editorRef.current.setModel(model);
        }
    }, [isEditorReady, rootDirectory, activeFileName]);

    // Styling

    useEffect(() => {
        monacoRef.current?.editor.setTheme(asMonacoTheme(colorMode));
    }, [colorMode]);

    const toggleHeight = useCallback(() => {
        setCollapsed(!collapsed);
    }, [collapsed]);

    const height = collapsed ? defaultHeight : `calc(${defaultHeight} * 2)`;

    return (
        <div>
            <div className={styles.header} role="tablist">
                {files
                    .filter((file) => !file.hidden)
                    .map((file) => {
                        return (
                            /* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Keyboard listener is handled by focused editor via action */
                            <div
                                role="tab"
                                tabIndex={0}
                                aria-selected={file.name === activeFileName}
                                aria-keyshortcuts={
                                    file.name === activeFileName
                                        ? ""
                                        : "Control+ArrowRight Meta+ArrowRight Control+ArrowLeft Meta+ArrowLeft"
                                }
                                key={file.name}
                                className={clsx(styles.fileTab, { [styles.active]: file.name === activeFileName })}
                                onClick={() => {
                                    setActiveFileName(file.name);
                                }}
                            >
                                {file.name}
                            </div>
                        );
                    })}
                <div className={styles.headerRight}>
                    {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Keyboard listener is handled by focused editor via action */}
                    <div
                        role="switch"
                        tabIndex={0}
                        aria-checked={collapsed}
                        aria-keyshortcuts={
                            collapsed ? "Control+ArrowDown Meta+ArrowDown" : "Control+ArrowUp Meta+ArrowUp"
                        }
                        className={styles.sizeToggleButton}
                        onClick={toggleHeight}
                    >
                        <IconArrow style={{ transform: collapsed ? "rotate(90deg)" : "rotate(-90deg)" }} />
                    </div>
                </div>
            </div>
            <Editor
                {...editorProps}
                height={height}
                wrapperProps={{
                    className: styles.editor,
                }}
                options={{
                    tabSize: 2,
                    lineNumbers: "off",
                    scrollBeyondLastLine: false,
                    folding: false,
                    bracketPairColorization: { enabled: false },
                    minimap: {
                        enabled: true,
                        renderCharacters: false,
                    },
                }}
                onMount={afterMount}
                onChange={onChange}
            />
        </div>
    );
}
