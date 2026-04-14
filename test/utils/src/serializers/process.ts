// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import { ExitCode } from "@stricli/core";
import path from "node:path";
import url from "node:url";
import type { SnapshotSerializer } from "vitest";
import { FakeTerminal } from "../fakes/terminal";

const REPO_ROOT_REPLACEMENT = "#/";

interface StackTraceSanitizerOptions {
    readonly root: url.URL;
}

function sanitizeStackTraceReferences(text: string, options: StackTraceSanitizerOptions): string {
    const rootPath = url.fileURLToPath(options.root);
    const rootRegex = new RegExp(rootPath.replaceAll(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "ig");
    return text
        .split("\n")
        .filter((line) => {
            if (line.includes("    at ") && (line.includes("node_modules") || line.includes("node:"))) {
                return false;
            }
            return true;
        })
        .map((line) => {
            if (line.includes("    at ")) {
                line = line.replaceAll(options.root.href, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(rootRegex, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(path.win32.sep, path.posix.sep);
                line = line.replaceAll(/:\d+/g, ":?");
            }
            return line;
        })
        .join("\n");
}

export interface OutputSanitizerOptions extends StackTraceSanitizerOptions {

}

function sanitizeOutput(text: string, options: OutputSanitizerOptions): string {
    text = text.replaceAll("\x1b", "␛");
    text = sanitizeStackTraceReferences(text, options);
    return text;
}

function serializeExitCode(exitCode: number | string | null | undefined): string {
    const knownExitCode = Object.entries(ExitCode).find(([_, value]) => value === exitCode);
    if (typeof exitCode === "number") {
        return `${exitCode} (${knownExitCode ? knownExitCode[0] : "Unknown"})`;
    }
    return "0 <<No exit code specified>>";
}

export type ProcessResult = {
    readonly terminal: FakeTerminal;
    readonly exitCode?: number | string | null;
};

export function buildProcessResultSerializer(options: OutputSanitizerOptions) {
    return {
        test(val: unknown) {
            return Boolean(val && typeof val === "object" && "exitCode" in val && "terminal" in val && FakeTerminal.isFakeTerminal(val.terminal));
        },
        serialize(val: ProcessResult) {
            return `${sanitizeOutput(val.terminal.serialize(), options)}\n[:exit:] ${serializeExitCode(val.exitCode)}`;
        },
    } satisfies SnapshotSerializer;
}
