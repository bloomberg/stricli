// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { stub, type SinonStub } from "sinon";
import type {
    CommandContext,
    CommandInfo,
    EnvironmentVariableName,
    StricliDynamicCommandContext,
    StricliProcess,
} from "../../src";

interface FakeWritable {
    readonly write: SinonStub<[string], void>;
}
interface FakeProcess extends StricliProcess {
    readonly stdout: FakeWritable;
    readonly stderr: FakeWritable;
    readonly exit: (code: number) => void;
}

export type FakeContext = StricliDynamicCommandContext<CommandContext> & {
    readonly process: FakeProcess;
    forCommand?: SinonStub<[CommandInfo], FakeContext>;
};

export interface FakeContextOptions {
    readonly forCommand?: boolean | (() => never);
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
        locale: options.locale,
    };
    if (options.forCommand) {
        if (typeof options.forCommand === "function") {
            context.forCommand = stub<[CommandInfo]>().callsFake(options.forCommand);
        } else {
            context.forCommand = stub<[CommandInfo]>().returns(context);
        }
    }
    return context;
}
