// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import path from "node:path";
import url from "node:url";
import type { SnapshotSerializer } from "vitest";
import { ExitCode, type DocumentedCommand } from "../src";
import type { CommandRunResult } from "./routing/command.spec";
import type { ApplicationRunResult } from "./application.spec";

const repoRootUrl = new url.URL("..", import.meta.url);
const repoRootPath = url.fileURLToPath(repoRootUrl);
const repoRootRegex = new RegExp(repoRootPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "ig");

const REPO_ROOT_REPLACEMENT = "#/";

function sanitizeStackTraceReferences(text: string): string {
    return text
        .split("\n")
        .filter((line) => {
            if (line.startsWith("    at ") && (line.includes("node_modules") || line.includes("node:"))) {
                return false;
            }
            return true;
        })
        .map((line) => {
            if (line.startsWith("    at ")) {
                line = line.replaceAll(repoRootUrl.href, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(repoRootRegex, REPO_ROOT_REPLACEMENT);
                line = line.replaceAll(path.win32.sep, path.posix.sep);
                line = line.replaceAll(/:\d+/g, ":?");
            }
            return line;
        })
        .join("\n");
}

function serializeExitCode(exitCode: number | string | null | undefined): string {
    const knownExitCode = Object.entries(ExitCode).find(([_, value]) => value === exitCode);
    if (knownExitCode) {
        return knownExitCode[0];
    }
    if (typeof exitCode === "number") {
        return `Unknown(${exitCode})`;
    }
    return "<<No exit code specified>>";
}

// Serializer for CommandRunResult and ApplicationRunResult
export const runResultSerializer: SnapshotSerializer = {
    test(val: unknown): val is CommandRunResult | ApplicationRunResult {
        return (
            typeof val === "object" &&
            val !== null &&
            "stdout" in val &&
            "stderr" in val &&
            "exitCode" in val &&
            typeof val.stdout === "string" &&
            typeof val.stderr === "string"
        );
    },
    serialize(val: CommandRunResult | ApplicationRunResult): string {
        const lines = [
            `ExitCode=${serializeExitCode(val.exitCode)}`,
            ":: STDOUT",
            val.stdout,
            ":: STDERR",
            sanitizeStackTraceReferences(val.stderr),
        ];
        return lines.join("\n");
    },
};

// Serializer for DocumentedCommand arrays
export const documentedCommandArraySerializer: SnapshotSerializer = {
    test(val: unknown): val is readonly DocumentedCommand[] {
        return (
            Array.isArray(val) &&
            val.length > 0 &&
            Array.isArray(val[0]) &&
            val[0].length === 2 &&
            typeof val[0][0] === "string" &&
            typeof val[0][1] === "string"
        );
    },
    serialize(val: readonly DocumentedCommand[]): string {
        const lines: string[] = [];
        for (const route of val) {
            lines.push(`:: ${route[0]}`);
            lines.push(...route[1].split("\n"));
        }
        return lines.join("\n");
    },
};
