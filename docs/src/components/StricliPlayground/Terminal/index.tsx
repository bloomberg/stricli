// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import React, { useState, useEffect, useRef, useCallback } from "react";
import Ansi from "./Ansi";

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
    const [completions, setCompletions] = useState<readonly string[]>([]);
    const [completionIndex, setCompletionIndex] = useState<number | undefined>(void 0);

    useEffect(() => {
        if (appLoaded) {
            if (!firstRunComplete) {
                setFirstRunComplete(true);
                void (async () => {
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
    }, [appLoaded, firstRunComplete, input, history, historyIndex, collapsed]);

    const focusInput = useCallback(() => {
        inputRef.current?.focus();
    }, []);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }, []);

    const onKeyDown = useCallback(
        async (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== "Tab" && typeof completionIndex === "number") {
                setCompletionIndex(void 0);
            }

            const inputWithPrefix = `${commandPrefix} ${input}`;
            if (e.key === "Enter") {
                const lines = await executeInput(input);
                setHistory([...lines, ...history]);
                setHistoryIndex(void 0);
                setCollapsed(false);
                setInput("");
            } else if (e.key === "ArrowUp") {
                setHistoryIndex(typeof historyIndex === "number" ? historyIndex + 1 : 0);
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                if (historyIndex === 0) {
                    setInput("");
                    setHistoryIndex(void 0);
                } else if (typeof historyIndex === "number") {
                    setHistoryIndex(historyIndex - 1);
                }
                e.preventDefault();
            } else if (e.key === "Tab" && completeInput) {
                if (typeof completionIndex === "number") {
                    setCompletionIndex(completionIndex + 1);
                } else {
                    const inputCompletions = await completeInput(inputWithPrefix);
                    const completions = inputCompletions.map((str) => str.slice(commandPrefix.length + 1));
                    setCompletions(completions);
                    setCompletionIndex(0);
                }
                e.preventDefault();
            }
        },
        [input, history, historyIndex, completionIndex],
    );

    useEffect(() => {
        if (typeof historyIndex === "number") {
            const stdinHistory = history.filter((line) => line[1] === "stdin");
            const historySelection = stdinHistory[historyIndex];
            if (historySelection) {
                setInput(historySelection[0]);
            } else {
                setInput("");
                setHistoryIndex(void 0);
            }
        }
    }, [history, historyIndex]);

    useEffect(() => {
        if (typeof completionIndex === "number") {
            const completionSelection = completions[completionIndex];
            if (completionSelection) {
                setInput(completionSelection);
            } else if (completions.length > 0) {
                setCompletionIndex(completionIndex % completions.length);
            } else {
                setCompletionIndex(void 0);
            }
        }
    }, [completions, completionIndex]);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setHistoryIndex(void 0);
        setCollapsed(true);
    }, [history, historyIndex, collapsed]);

    const height = collapsed ? `${LINE_HEIGHT_EM}em` : expandedHeight;

    return (
        <div className="terminal-container" style={{ height }}>
            <div className="terminal-navbar">
                {additionalNavbarElements}
                <button key="terminal-navbar-clear" onClick={clearHistory}>
                    Clear
                </button>
            </div>
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
                        onChange={onChange}
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises
                        onKeyDown={onKeyDown}
                    />
                </div>
                {history.map((line, i) => {
                    const text = line[1] === "stdin" ? `${commandPrompt}${line[2]} ${line[0]}` : line[0];
                    return (
                        <Ansi key={`terminal-history-line-${i}`} className={`terminal-${line[1]}`}>
                            {text}
                        </Ansi>
                    );
                })}
            </div>
        </div>
    );
}
