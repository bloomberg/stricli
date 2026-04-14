// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type {
    EnvironmentVariableName,
    StricliProcess
} from "@stricli/core";
import { FakeTerminal } from "./terminal";

export interface FakeProcess extends StricliProcess {
    readonly terminal: FakeTerminal;
    readonly exit: (code: number) => void;
}

export interface FakeProcessOptions {
    readonly colorDepth?: number;
    readonly env?: Partial<Record<EnvironmentVariableName, string>>;
}

export function buildFakeProcess(options: FakeProcessOptions = { colorDepth: 4 }): FakeProcess {
    let exitCode!: number;
    const terminal = new FakeTerminal();
    return {
        terminal,
        stdout: terminal.stdout(options),
        stderr: terminal.stderr(options),
        env: options.env,
        exit: (code) => {
            exitCode = code;
        },
        set exitCode(code) {
            exitCode = code;
        },
        get exitCode() {
            return exitCode;
        },
    };
}
