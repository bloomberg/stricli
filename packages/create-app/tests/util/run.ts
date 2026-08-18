// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import * as child_process from "node:child_process";
import { FakeTerminal } from "./terminal";
import type { ExpectStatic } from "vitest";
import type { Volume } from "memfs";
import { writeVolumeToTemporaryDirectory } from "./volume";
import { join } from "node:path";
import { findPathForBin, runBuildScript } from "./npm";

type BuildAndRunOptions = {
    readonly pathToPackage: string;
    readonly binName: string;
    readonly commands: readonly (readonly string[])[];
    readonly expect: ExpectStatic;
};

export async function buildAndRunApplication(volume: Volume, options: BuildAndRunOptions): Promise<void> {
    await writeVolumeToTemporaryDirectory(volume, async (root) => {
        const packageRoot = join(root, options.pathToPackage);
        await runBuildScript(packageRoot);
        const binScriptPath = findPathForBin(packageRoot, options.binName);

        for (const inputs of options.commands) {
            const result = await runScript(binScriptPath, inputs, { cwd: packageRoot });
            options.expect(result).toMatchSnapshot(`command: ${options.binName} ${inputs.join(" ")}`);
        }
    });
}

async function runScript(
    scriptPath: string,
    inputs: readonly string[],
    options: child_process.SpawnOptions,
): Promise<FakeTerminal> {
    const terminal = new FakeTerminal();

    const appProcess = child_process.spawn("node", [scriptPath, ...inputs], {
        ...options,
        stdio: ["ignore", "pipe", "pipe"],
    });
    appProcess.stdout.on("data", (data: Buffer) => {
        terminal.stdout.write(data.toString());
    });
    appProcess.stderr.on("data", (data: Buffer) => {
        terminal.stderr.write(data.toString());
    });

    const { promise, resolve, reject } = Promise.withResolvers<FakeTerminal>();

    appProcess.on("close", (exitCode) => {
        if (exitCode !== 0) {
            reject(new Error(`Process exited with code ${exitCode}`));
            return;
        }
        resolve(terminal);
    });
    appProcess.on("error", reject);

    return promise;
}
