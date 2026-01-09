// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import nodePath from "node:path";
import url from "node:url";
import type { SnapshotSerializer } from "vitest";
import type { PackageJson } from "type-fest";
import type { ApplicationTestResult } from "./app.spec";

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
                line = line.replaceAll(nodePath.win32.sep, nodePath.posix.sep);
                line = line.replaceAll(/:\d+/g, ":?");
            }
            return line;
        })
        .join("\n");
}

const FILE_ENTRY_PREFIX = "::::";

// Serializer for ApplicationTestResult
export const applicationTestResultSerializer: SnapshotSerializer = {
    test(val: unknown): val is ApplicationTestResult {
        return (
            typeof val === "object" &&
            val !== null &&
            "stdout" in val &&
            "stderr" in val &&
            "files" in val &&
            typeof val.stdout === "string" &&
            typeof val.stderr === "string" &&
            typeof val.files === "object"
        );
    },
    serialize(val: ApplicationTestResult): string {
        const lines: string[] = [];
        lines.push("[STDOUT]");
        lines.push(val.stdout);
        lines.push("[STDERR]");
        lines.push(sanitizeStackTraceReferences(val.stderr));
        lines.push("[FILES]");

        const fileEntries = Object.entries(val.files).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [path, text] of fileEntries) {
            if (text) {
                lines.push(`${FILE_ENTRY_PREFIX}${path}`);
                if (path.endsWith("package.json")) {
                    const obj = JSON.parse(text.toString()) as PackageJson;
                    const dependencies = Object.entries(obj.dependencies ?? {});
                    obj.dependencies = Object.fromEntries(dependencies.map(([key]) => [key, "<self>"]));
                    lines.push(JSON.stringify(obj, void 0, 2));
                } else {
                    lines.push(text.toString());
                }
            }
        }

        return lines.join("\n");
    },
};
