// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "@stricli/core";
import type { StricliAutoCompleteContext } from "@stricli/auto-complete";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface LocalContext extends CommandContext, StricliAutoCompleteContext {
    readonly process: StricliAutoCompleteContext["process"] & {
        readonly cwd: () => string;
        readonly versions?: { readonly node?: string };
    };
    readonly fs: {
        readonly promises: Pick<typeof import("fs").promises, "readFile" | "writeFile" | "mkdir">;
    };
    readonly path: Pick<typeof import("path"), "join" | "basename">;
}

/* v8 ignore start -- @preserve */
export function buildContext(process: NodeJS.Process): LocalContext {
    return {
        process,
        os,
        fs,
        path,
    };
}
/* v8 ignore stop -- @preserve */
