// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext, StricliProcess } from "@stricli/core";

export type SystemDependencies = {
    readonly os: Pick<typeof import("node:os"), "homedir">;
    readonly fs: {
        readonly promises: Pick<typeof import("node:fs").promises, "readFile" | "writeFile">;
    };
    readonly path: Pick<typeof import("node:path"), "join">;
};

export interface StricliAutoCompleteContext extends CommandContext, Partial<SystemDependencies> {
    readonly process: StricliProcess;
}
