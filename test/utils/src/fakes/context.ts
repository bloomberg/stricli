// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type {
    CommandContext,
    CommandInfo,
    StricliDynamicCommandContext
} from "@stricli/core";
import { vi, type Mock } from "vitest";
import { buildFakeProcess, type FakeProcess, type FakeProcessOptions } from "./process";

export type FakeContext = StricliDynamicCommandContext<CommandContext> & {
    readonly process: FakeProcess;
    forCommand?: Mock<(info: CommandInfo) => FakeContext>;
};

export interface FakeContextOptions extends FakeProcessOptions {
    readonly forCommand?: boolean | ((info: CommandInfo) => FakeContext);
    readonly locale?: string;
}

export function buildFakeContext(options: FakeContextOptions = { forCommand: true, colorDepth: 4 }): FakeContext {
    const context: FakeContext = {
        process: buildFakeProcess(options),
        locale: options.locale,
    };
    if (options.forCommand) {
        if (typeof options.forCommand === "function") {
            context.forCommand = vi.fn(options.forCommand);
        } else {
            context.forCommand = vi.fn().mockReturnValue(context);
        }
    }
    return context;
}
