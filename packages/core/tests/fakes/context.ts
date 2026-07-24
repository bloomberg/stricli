// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import { vi, type Mock } from "vitest";
import type {
    CommandContext,
    CommandInfo,
    EnvironmentVariableName,
    StricliDynamicCommandContext,
    StricliProcess,
} from "../../src";

interface FakeWritable {
    readonly write: Mock<(text: string) => void>;
}
interface FakeProcess extends StricliProcess {
    readonly stdout: FakeWritable;
    readonly stderr: FakeWritable;
    readonly exit: (code: number) => void;
}

export type FakeContext = StricliDynamicCommandContext<CommandContext> & {
    readonly process: FakeProcess;
    forCommand?: Mock<(info: CommandInfo) => FakeContext>;
};

export interface FakeContextOptions {
    readonly forCommand?: boolean | ((info: CommandInfo) => never);
    readonly locale?: string;
    readonly colorDepth?: number;
    readonly env?: Partial<Record<EnvironmentVariableName, string>>;
}

export function buildFakeContext(options: FakeContextOptions = { forCommand: true, colorDepth: 4 }): FakeContext {
    const colorDepth = options.colorDepth;
    let exitCode!: number;
    const context: FakeContext = {
        process: {
            stdout: {
                write: vi.fn(),
                ...(typeof colorDepth === "number"
                    ? {
                          getColorDepth() {
                              return colorDepth;
                          },
                      }
                    : {}),
            },
            stderr: {
                write: vi.fn(),
                ...(typeof colorDepth === "number"
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
        locale: options.locale,
    };
    if (options.forCommand) {
        if (typeof options.forCommand === "function") {
            context.forCommand = vi.fn<(info: CommandInfo) => FakeContext>().mockImplementation(options.forCommand);
        } else {
            context.forCommand = vi.fn<(info: CommandInfo) => FakeContext>().mockReturnValue(context);
        }
    }
    return context;
}
