// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

const baselineDir = path.join(__dirname, "baselines");
const referenceBaselinesDir = path.join(baselineDir, "reference");
const localBaselinesDir = path.join(baselineDir, "local");

interface FileBaseline {
    readonly load: <T, O>(format: BaselineFormat<T, O>) => O | undefined;
    readonly store: <T, O>(format: BaselineFormat<T, O>, result: T) => void;
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
        expect(actual.join("\n")).to.equal(expected.join("\n"), "Help text did not match baseline");
    },
};

const FILE_BASELINES_BY_PATH = new Map<string, FileBaseline>();

function getFileBaseline(testPath: string): FileBaseline {
    let baseline = FILE_BASELINES_BY_PATH.get(testPath);
    if (baseline) {
        return baseline;
    }
    let lines: string[] | undefined;
    try {
        const referenceBaselinesPath = path.join(referenceBaselinesDir, testPath + ".txt");
        lines = fs.readFileSync(referenceBaselinesPath).toString().split(/\n/);
    } catch {
        // no baseline yet
    }
    baseline = {
        load: (format) => {
            if (lines) {
                return format.parse(lines);
            }
        },
        store: (format, result) => {
            lines = [...format.serialize(result)];
        },
        save: () => {
            if (!lines) {
                return;
            }
            const localBaselinesTestPath = path.join(localBaselinesDir, testPath + ".txt");
            const localBaselinesTestDir = path.dirname(localBaselinesTestPath);
            fs.mkdirSync(localBaselinesTestDir, { recursive: true });
            fs.writeFileSync(localBaselinesTestPath, lines.join("\n"));
        },
    };
    FILE_BASELINES_BY_PATH.set(testPath, baseline);
    return baseline;
}

after(() => {
    for (const baselines of FILE_BASELINES_BY_PATH.values()) {
        baselines.save();
    }
});

export function compareToBaseline<T, O>(context: Mocha.Context, format: BaselineFormat<T, O>, result: T): void {
    assert(context.test, "Mocha context does not have a runnable test");
    assert(context.test.file, "Unable to determine file of current test");
    const testPathParts = path.relative(__dirname, context.test.file.replace(/\.spec\.(js|ts)$/, "")).split(path.sep);
    testPathParts.push(...context.test.titlePath());
    const baselines = getFileBaseline(testPathParts.join(path.sep));

    try {
        const actualResult = format.parse([...format.serialize(result)]);
        const expectedResult = baselines.load(format);
        if (!expectedResult) {
            throw new Error(`No reference baseline found for test case`);
        }
        format.compare(actualResult, expectedResult);
    } catch (exc) {
        baselines.store(format, result);
        throw exc;
    }
}
