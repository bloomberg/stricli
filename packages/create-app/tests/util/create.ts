// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { run } from "@stricli/core";
import { createFsFromVolume, Volume } from "memfs";
import nodePath from "node:path";
import sinon from "sinon";
// eslint-disable-next-line no-restricted-imports
import { app } from "../../src/app";
// eslint-disable-next-line no-restricted-imports
import type { LocalContext } from "../../src/context";
import type { DeepPartial } from "./types";
import { FakeTerminal } from "../util/terminal";

interface ApplicationCreateOptions {
    readonly cwd: string;
    readonly nodeVersion?: string;
}

interface ApplicationCreateResult {
    readonly terminal: FakeTerminal;
    readonly volume: Volume;
}

export async function createNewApplication(
    inputs: readonly string[],
    options: ApplicationCreateOptions,
): Promise<ApplicationCreateResult> {
    const terminal = new FakeTerminal();
    const cwd = sinon.stub().returns(options.cwd);
    const volume = Volume.fromJSON({});
    const memfs = createFsFromVolume(volume);

    const localContext: DeepPartial<LocalContext> = {
        process: {
            stdout: terminal.stdout,
            stderr: terminal.stderr,
            cwd,
            versions: {
                node: options.nodeVersion,
            },
        },
        fs: memfs,
        path: nodePath,
    };

    await run(app, inputs, localContext as LocalContext);

    return {
        terminal,
        volume,
    };
}
