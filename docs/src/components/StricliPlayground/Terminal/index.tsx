// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import React, { useState, useEffect, useRef, useCallback } from "react";
import Ansi from "./Ansi";
import clsx from "clsx";

export type TerminalHistoryLine =
    | readonly [text: string, stream: "stdout" | "stderr"]
    | readonly [text: string, stream: "stdin", prefix: string];

export interface TerminalProps {
    appLoaded?: boolean;
    initialInputs?: readonly string[];
    defaultValue?: string;
    commandPrefix?: string;
    commandPrompt?: string;
    startCollapsed?: boolean;
    height: string;
    executeInput: (input: string) => Promise<readonly TerminalHistoryLine[]>;
    completeInput?: (input: string) => Promise<readonly string[]>;
    additionalNavbarElements?: readonly React.JSX.Element[];
}

const LINE_HEIGHT_EM = 1.25;

export default function Terminal({
    appLoaded,
    initialInputs = [],
    defaultValue = "",
    commandPrefix = "",
    commandPrompt = "> ",
    startCollapsed = true,
    height: expandedHeight,
    executeInput,
    completeInput,
    additionalNavbarElements,
}: TerminalProps) {
    const inputRef = useRef<HTMLInputElement>();
    const [collapsed, setCollapsed] = useState<boolean>(startCollapsed);
    const [firstRunComplete, setFirstRunComplete] = useState<boolean>(false);
    const [input, setInput] = useState<string>(defaultValue);
    const [history, setHistory] = useState<readonly TerminalHistoryLine[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number | undefined>(void 0);
    const autocomplete = useRef<[index: number, completions: readonly string[]] | undefined>(void 0);

    const selectedStdinIndex = typeof historyIndex === "number" ? historyIndex * 2 + 1 : void 0;

    useEffect(() => {
        if (appLoaded) {
            if (!firstRunComplete) {
                void (async () => {
                    setFirstRunComplete(true);
                    const initialHistory = [...history];
                    for (const input of initialInputs) {
                        const lines = await executeInput(input);
                        initialHistory.unshift(...lines);
                    }
                    setHistory(initialHistory);
                    setHistoryIndex(void 0);
                })();
            }
        }
    }, [appLoaded, firstRunComplete, initialInputs, executeInput, history]);

    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }, []);

    const onInputSubmit = useCallback(async () => {
        const lines = await executeInput(input);
        setHistory([...lines, ...history]);
        setHistoryIndex(void 0);
        setCollapsed(false);
        setInput("");
    }, [input, executeInput, history]);

    const setInputToHistoryAtIndex = useCallback(
        (index: number) => {
            const stdinHistory = history.filter((line) => line[1] === "stdin");
            const historySelection = stdinHistory[index];
            if (historySelection) {
                setInput(historySelection[0]);
            } else {
                setInput("");
            }
        },
        [history],
    );

    const onScrollHistoryUp = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const newIndex = typeof historyIndex === "number" ? (historyIndex + 1) % (history.length / 2) : 0;
            setHistoryIndex(newIndex);
            setInputToHistoryAtIndex(newIndex);
            e.preventDefault();
        },
        [history, historyIndex, setInputToHistoryAtIndex],
    );

    const onScrollHistoryDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (historyIndex === 0) {
                setInput("");
                setHistoryIndex(void 0);
            } else if (typeof historyIndex === "number") {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInputToHistoryAtIndex(newIndex);
            }
            e.preventDefault();
        },
        [historyIndex, setInputToHistoryAtIndex],
    );

    const onToggleAutocomplete = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            let currentIndex: number;
            let completions: readonly string[];
            if (autocomplete.current) {
                [currentIndex, completions] = autocomplete.current;
            } else {
                completions = await completeInput(input);
                currentIndex = -1;
                autocomplete.current = [0, completions];
            }
            const nextIndex = (currentIndex + 1) % completions.length;
            setInput(completions[nextIndex]);
            autocomplete.current = [nextIndex, completions];
            e.preventDefault();
        },
        [autocomplete, input, completeInput],
    );

    const onKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== "Tab" && autocomplete) {
                autocomplete.current = void 0;
            }

            if (e.key === "Enter") {
                await onInputSubmit();
            } else if (e.key === "ArrowUp") {
                onScrollHistoryUp(e);
            } else if (e.key === "ArrowDown") {
                onScrollHistoryDown(e);
            } else if (e.key === "Tab") {
                await onToggleAutocomplete(e);
            }
        },
        [autocomplete, onInputSubmit, onScrollHistoryUp, onScrollHistoryDown, onToggleAutocomplete],
    );

    const clearHistory = useCallback(() => {
        setHistory([]);
        setHistoryIndex(void 0);
        setCollapsed(true);
    }, []);

    const height = collapsed ? `${LINE_HEIGHT_EM}em` : expandedHeight;

    return (
        <div className="terminal-container" style={{ height }}>
            <div className="terminal-navbar">
                {additionalNavbarElements}
                <button key="terminal-navbar-clear" onClick={clearHistory}>
                    Clear
                </button>
            </div>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions,jsx-a11y/click-events-have-key-events -- Click handler exists to focus on actual input element */}
            <div className="terminal-output" style={{ height }} onClick={focusInput}>
                <div className="ansi-block terminal-input">
                    <span style={{ display: "inline-flex" }}>
                        {commandPrompt}
                        {commandPrefix}{" "}
                    </span>
                    <input
                        className="terminal-input-textinput"
                        ref={inputRef}
                        type="text"
                        value={input}
                        spellCheck={false}
                        onChange={onChange}
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises
                        onKeyDown={onKeyDown}
                    />
                </div>
                {history.map((line, i) => {
                    const text = line[1] === "stdin" ? `${commandPrompt}${line[2]} ${line[0]}` : line[0];
                    return (
                        <Ansi
                            key={`terminal-history-line-${i}`}
                            className={clsx({
                                [`terminal-${line[1]}`]: true,
                                [`terminal-history-selected`]: i === selectedStdinIndex,
                            })}
                        >
                            {text}
                        </Ansi>
                    );
                })}
            </div>
        </div>
    );
}
