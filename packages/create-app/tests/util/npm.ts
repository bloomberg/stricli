// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import * as child_process from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import type { PackageJson } from "type-fest";

export function findPathForBin(packageRoot: string, binName: string): string {
    const packageJsonPath = join(packageRoot, "package.json");
    const packageJsonText = readFileSync(packageJsonPath, { encoding: "utf8" });
    const packageJson = JSON.parse(packageJsonText) as PackageJson;

    let relativeBinPath: string | undefined;
    if (typeof packageJson.bin === "string") {
        relativeBinPath = packageJson.bin;
    } else {
        relativeBinPath = packageJson.bin?.[binName];
    }
    if (!relativeBinPath) {
        throw new Error(`This package has no bin script with name ${binName}`);
    }

    return join(packageRoot, relativeBinPath);
}

const execFile = promisify(child_process.execFile);

export async function runBuildScript(packageRoot: string): Promise<void> {
    await execFile("node", ["--run", "prebuild"], {
        cwd: packageRoot,
        env: process.env,
    });
    await execFile("node", ["--run", "build"], {
        cwd: packageRoot,
        env: process.env,
    });
}
