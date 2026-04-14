// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type { SnapshotSerializer } from "vitest";
import { buildProcessResultSerializer, type ProcessResult, type OutputSanitizerOptions } from "./process";

export type WorkspaceResult = {
    readonly process: ProcessResult;
    readonly files: Record<string, string | null>;
};

interface FileSanitizerOptions {
    readonly packageVersion: string;
}

function serializeFiles(files: Record<string, string | null>, options: FileSanitizerOptions): string {
    const sortedFiles = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
    return Object.entries(sortedFiles).map(([path, content]) => {
        if (content === null) {
            return `:::: ${path} <deleted>`;
        }
        content = content.replaceAll(options.packageVersion, "<self>");
        return `:::: ${path}\n${content}\n`;
    }).join("\n");
}

export type WorkspaceResultSerializerOptions = OutputSanitizerOptions & FileSanitizerOptions;

export function buildWorkspaceResultSerializer(options: WorkspaceResultSerializerOptions): SnapshotSerializer {
    const processResultSerializer = buildProcessResultSerializer(options);
    return {
        test(val: unknown) {
            return Boolean(val && typeof val === "object" && "process" in val && processResultSerializer.test(val.process) && "files" in val && typeof val.files === "object");
        },
        serialize(val: WorkspaceResult) {
            return `${processResultSerializer.serialize(val.process)}\n${serializeFiles(val.files, options)}`;
        },
    };
}
