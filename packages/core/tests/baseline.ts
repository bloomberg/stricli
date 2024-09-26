// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { expect } from "chai";
import url from "node:url";

const __dirnameUrl = new url.URL(".", import.meta.url);
const __dirname = url.fileURLToPath(__dirnameUrl);

const baselineDir = path.join(__dirname, "baselines");
const referenceBaselinesDir = path.join(baselineDir, "reference");
const localBaselinesDir = path.join(baselineDir, "local");

interface FileBaselines {
    readonly load: <T, O>(title: string, format: BaselineFormat<T, O>) => O | undefined;
    readonly store: <T, O>(title: string, format: BaselineFormat<T, O>, result: T) => void;
    readonly save: () => void;
}

export interface BaselineFormat<T, O = T> {
    readonly serialize: (result: T) => Generator<string> | readonly string[];
    readonly parse: (lines: readonly string[]) => O;
    readonly compare: (actual: O, expected: O) => void;
}

export const StringArrayBaselineFormat: BaselineFormat<readonly string[]> = {
    serialize(result) {
        return result;
    },
    parse(lines) {
        return lines;
    },
    compare(actual, expected) {
        expect(actual.join("\n")).to.equal(expected.join("\n"), "Output did not match baseline");
    },
};

const repoRootUrl = new url.URL("..", import.meta.url);
const repoRootPath = url.fileURLToPath(repoRootUrl);
const repoRootRegex = new RegExp(repoRootPath.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "ig");

const REPO_ROOT_REPLACEMENT = "#/";

export function sanitizeStackTraceReferences(text: string): string {
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

const BASELINE_TEST_PREFIX = "::::";

const FILE_BASELINES_BY_PATH = new Map<string, FileBaselines>();

function getFileBaselines(testPath: string): FileBaselines {
    let baselines = FILE_BASELINES_BY_PATH.get(testPath);
    if (baselines) {
        return baselines;
    }
    const resultLinesByTitlePath = new Map<string, readonly string[]>();
    try {
        const referenceBaselinesPath = path.join(referenceBaselinesDir, testPath + ".txt");
        const lines = fs.readFileSync(referenceBaselinesPath).toString().split(/\n/);
        let currentTitlePath: string | undefined;
        let currentResultLines: string[] = [];
        for (const line of lines) {
            if (line.startsWith(`${BASELINE_TEST_PREFIX} `)) {
                if (currentTitlePath) {
                    resultLinesByTitlePath.set(currentTitlePath, currentResultLines);
                }
                currentTitlePath = line.substring(BASELINE_TEST_PREFIX.length + 1);
                currentResultLines = [];
            } else {
                currentResultLines.push(line);
            }
        }
        if (currentTitlePath) {
            resultLinesByTitlePath.set(currentTitlePath, currentResultLines);
        }
    } catch {
        // no baseline yet
    }
    baselines = {
        load: (title, format) => {
            const resultLines = resultLinesByTitlePath.get(title);
            if (resultLines) {
                return format.parse(resultLines);
            }
        },
        store: (title, format, result) => {
            resultLinesByTitlePath.set(title, [...format.serialize(result)]);
        },
        save: () => {
            const titles = [...resultLinesByTitlePath.keys()].sort();
            const lines = titles.flatMap((title) => {
                const resultLines = resultLinesByTitlePath.get(title)!;
                return [`${BASELINE_TEST_PREFIX} ${title}`, ...resultLines];
            });
            const localBaselinesTestPath = path.join(localBaselinesDir, testPath + ".txt");
            const localBaselinesTestDir = path.dirname(localBaselinesTestPath);
            fs.mkdirSync(localBaselinesTestDir, { recursive: true });
            fs.writeFileSync(localBaselinesTestPath, lines.join("\n"));
        },
    };
    FILE_BASELINES_BY_PATH.set(testPath, baselines);
    return baselines;
}

after(() => {
    for (const baselines of FILE_BASELINES_BY_PATH.values()) {
        baselines.save();
    }
});

export function compareToBaseline<T, O>(context: Mocha.Context, format: BaselineFormat<T, O>, result: T): void {
    assert(context.test, "Mocha context does not have a runnable test");
    assert(context.test.file, "Unable to determine file of current test");
    const testPath = path
        .relative(__dirname, context.test.file.replace(/\.spec\.(js|ts)$/, ""))
        .split(path.sep)
        .join("/");
    const baselines = getFileBaselines(testPath);

    const title = context.test.titlePath().join(" / ");

    try {
        const actualResult = format.parse([...format.serialize(result)]);
        const expectedResult = baselines.load(title, format);
        if (!expectedResult) {
            throw new Error(`No reference baseline found for test case`);
        }
        format.compare(actualResult, expectedResult);
    } catch (exc) {
        baselines.store(title, format, result);
        throw exc;
    }
}
