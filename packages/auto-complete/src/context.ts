// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "@stricli/core";

export interface StricliAutoCompleteContext extends CommandContext {
    readonly process: Pick<NodeJS.Process, "stderr" | "stdout" | "env">;
    readonly os?: Pick<typeof import("os"), "homedir">;
    readonly fs?: {
        readonly promises: Pick<typeof import("fs").promises, "readFile" | "writeFile" | "mkdir" | "unlink">;
    };
    readonly path?: Pick<typeof import("path"), "join">;
}
