// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import path from "node:path";
import url from "node:url";
import type { SnapshotSerializer } from "vitest";
import { ExitCode } from "../../src";
import type { ApplicationRunResult } from "../application.spec";
import { FakeTerminal } from "../fakes/terminal";
import type { CommandRunResult } from "../routing/command.spec";

const REPO_ROOT_URL = new url.URL("../..", import.meta.url);
const REPO_ROOT_PATH = url.fileURLToPath(REPO_ROOT_URL);
const REPO_ROOT_REGEX = new RegExp(REPO_ROOT_PATH.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "ig");

const REPO_ROOT_REPLACEMENT = "#/";

function sanitizeStackTraceReferences(text: string): string {
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
                line = line.replaceAll(REPO_ROOT_URL.href, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(REPO_ROOT_REGEX, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(path.win32.sep, path.posix.sep);
                line = line.replaceAll(/:\d+/g, ":?");
            }
            return line;
        })
        .join("\n");
}

function sanitizeOutput(text: string): string {
    text = text.replaceAll("\x1b", "␛");
    text = sanitizeStackTraceReferences(text);
    return text;
}

function serializeExitCode(exitCode: number | string | null | undefined): string {
    const knownExitCode = Object.entries(ExitCode).find(([_, value]) => value === exitCode);
    if (typeof exitCode === "number") {
        return `${exitCode} (${knownExitCode ? knownExitCode[0] : "Unknown"})`;
    }
    return "0 <<No exit code specified>>";
}

export default {
    test(val: unknown) {
        return Boolean(val && typeof val === "object" && "exitCode" in val && "terminal" in val && FakeTerminal.isFakeTerminal(val.terminal));
    },
    serialize(val: CommandRunResult | ApplicationRunResult) {
        return `${sanitizeOutput(val.terminal.serialize())}\n::exit:: ${serializeExitCode(val.exitCode)}`;
    },
} satisfies SnapshotSerializer;
