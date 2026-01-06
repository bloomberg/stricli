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

import { useUpdate } from "../../util/hooks";

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

    const [emittedFiles, setEmittedFiles] = useState<Record<string, string>>({});

    const afterMount = useCallback<OnMount>((editor, monaco: Monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        const uris: Uri[] = [];
        for (const file of files) {
            const uri = monaco.Uri.parse(`file:///${rootDirectory}/${file.name}`);
            monaco.editor.createModel(file.initialValue, file.language, uri);
            uris.push(uri);
        }
        for (const [packageName, content] of Object.entries(libraries)) {
            monaco.typescript.typescriptDefaults.addExtraLib(content, `node_modules/@types/${packageName}/index.d.ts`);
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
            onEmit(newData);
            setEmittedFiles({ ...emittedFiles, ...newData });
        });
    }, []);

    if (onEmit) {
        useEffect(() => {
            onEmit(emittedFiles);
        }, [isEditorReady, emittedFiles]);
    }

    // File Switching

    const [activeFileName, setActiveFileName] = useState(files[0].name);

    const onChange = useCallback<OnChange>(() => {
        void tsRef.current.getEmitOutput(`file:///${rootDirectory}/${activeFileName}`).then((output) => {
            const newData = Object.fromEntries(output.outputFiles.map((file) => [file.name, file.text]));
            setEmittedFiles({ ...emittedFiles, ...newData });
        });
    }, [tsRef, emittedFiles]);

    useEffect(() => {
        if (isEditorReady) {
            const activeUri = monacoRef.current.Uri.parse(`file:///${rootDirectory}/${activeFileName}`);
            const model = monacoRef.current.editor.getModel(activeUri);
            editorRef.current.setModel(model);
        }
    }, [isEditorReady, activeFileName]);

    // Styling

    const { colorMode } = useColorMode();
    useUpdate(
        () => {
            monacoRef.current?.editor.setTheme(asMonacoTheme(colorMode));
        },
        [colorMode],
        isEditorReady,
    );

    const [collapsed, setCollapsed] = useState<boolean>(true);
    const toggleHeight = useCallback(() => {
        setCollapsed(!collapsed);
    }, [collapsed]);

    const height = collapsed ? defaultHeight : `calc(${defaultHeight} * 2)`;

    return (
        <div>
            <div className={styles.header}>
                {files
                    .filter((file) => !file.hidden)
                    .map((file) => {
                        return (
                            <div
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
                    <div className={styles.sizeToggleButton} onClick={toggleHeight}>
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
