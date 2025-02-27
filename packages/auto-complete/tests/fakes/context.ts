// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { StricliProcess } from "@stricli/core";
import { stub, type SinonStub } from "sinon";
import type { StricliAutoCompleteContext } from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { SystemDependencies } from "../../src/cli/context";

interface FakeWritable {
    readonly write: SinonStub<[string], void>;
}
interface FakeProcess extends StricliProcess {
    readonly stdout: FakeWritable;
    readonly stderr: FakeWritable;
    readonly exit: (code: number) => void;
}

export type FakeContext = StricliAutoCompleteContext & {
    readonly process: FakeProcess;
};

export interface FakeContextOptions extends Partial<SystemDependencies> {
    readonly forCommand?: boolean | (() => never);
    readonly locale?: string;
    readonly colorDepth?: number;
    readonly env?: Partial<Record<string, string>>;
}

export function buildFakeContext(options: FakeContextOptions = { forCommand: true, colorDepth: 4 }): FakeContext {
    const colorDepth = options.colorDepth;
    let exitCode!: number;
    return {
        process: {
            stdout: {
                write: stub(),
                ...(colorDepth
                    ? {
                          getColorDepth() {
                              return colorDepth;
                          },
                      }
                    : {}),
            },
            stderr: {
                write: stub(),
                ...(colorDepth
                    ? {
                          getColorDepth() {
                              return colorDepth;
                          },
                      }
                    : {}),
            },
            env: options.env,
            exit: (code) => {
                exitCode = code;
            },
        },
        ...options,
    };
}
