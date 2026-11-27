// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { Volume } from "memfs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function writeVolumeToTemporaryDirectory(
    volume: Volume,
    callback: (root: string) => Promise<void>,
): Promise<void> {
    const tempRoot = await mkdtemp(join(__dirname, "..", "..", ".temp", "app-"));
    for (const [path, text] of Object.entries(volume.toJSON())) {
        if (text === null) {
            continue;
        }
        const actualPath = join(tempRoot, path);
        await mkdir(dirname(actualPath), { recursive: true });
        await writeFile(actualPath, text);
    }

    try {
        await callback(tempRoot);
    } finally {
        await rm(tempRoot, { force: true, recursive: true });
    }
}
