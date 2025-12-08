// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { run } from "@stricli/core";
import { expect } from "chai";
import child_process from "child_process";
import { createFsFromVolume, Volume, type DirectoryJSON } from "memfs";
import nodePath from "node:path";
import url from "node:url";
import sinon from "sinon";
import type { PackageJson } from "type-fest";
import { app } from "../src/app";
import type { LocalContext } from "../src/context";
import { compareToBaseline, type BaselineFormat } from "./baseline";
import { FakeWritableStream } from "./stream";
import type { DeepPartial } from "./types";

interface ApplicationTestOptions {
    readonly cwd: string;
}

interface ApplicationTestResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly files: DirectoryJSON<string | null>;
}

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

const ApplicationTestResultFormat: BaselineFormat<ApplicationTestResult> = {
    compare(actual, expected) {
        expect(actual.stdout).to.equal(expected.stdout, "Expected stdout to match baseline");
        expect(actual.stderr).to.equal(expected.stderr, "Expected stderr to match baseline");
        const actualFileList = Object.keys(actual.files);
        expect(actualFileList).to.have.same.members(
            Object.keys(expected.files),
            "Expected virtual file system to have same files as baseline after test",
        );
        for (const filePath of actualFileList) {
            const actualText = actual.files[filePath];
            expect(actualText).to.equal(
                expected.files[filePath],
                `Expected contents of ${filePath} to match baseline after test`,
            );
        }
    },
    parse(lines) {
        const stdoutStartIdx = lines.indexOf("[STDOUT]");
        const stderrStartIdx = lines.indexOf("[STDERR]");
        const filesStartIdx = lines.indexOf("[FILES]");
        const stdout = lines.slice(stdoutStartIdx + 1, stderrStartIdx).join("\n");
        const stderr = lines.slice(stderrStartIdx + 1, filesStartIdx).join("\n");
        const filesText = lines.slice(filesStartIdx).join("\n").split(FILE_ENTRY_PREFIX).slice(1);
        const vol = Volume.fromJSON({});
        for (const fileText of filesText) {
            const pathIdx = fileText.indexOf("\n");
            const path = fileText.slice(0, pathIdx);
            const text = fileText.slice(pathIdx + 1);
            vol.mkdirSync(nodePath.dirname(path), { recursive: true });
            vol.writeFileSync(path, text);
        }
        return {
            stdout,
            stderr,
            files: vol.toJSON(),
        };
    },
    *serialize(result) {
        yield "[STDOUT]";
        yield result.stdout;
        yield "[STDERR]";
        yield sanitizeStackTraceReferences(result.stderr);
        yield "[FILES]";
        const fileEntries = Object.entries(result.files).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [path, text] of fileEntries) {
            if (text) {
                yield `${FILE_ENTRY_PREFIX}${path}`;
                if (path.endsWith("package.json")) {
                    const obj = JSON.parse(text.toString()) as PackageJson;
                    const dependencies = Object.entries(obj.dependencies ?? {});
                    obj.dependencies = Object.fromEntries(dependencies.map(([key]) => [key, "<self>"]));
                    yield JSON.stringify(obj, void 0, 2);
                } else {
                    yield text.toString();
                }
            }
        }
    },
};

async function testApplication(
    inputs: readonly string[],
    options: ApplicationTestOptions,
): Promise<ApplicationTestResult> {
    const stdout = new FakeWritableStream();
    const stderr = new FakeWritableStream();
    const cwd = sinon.stub().returns(options.cwd);
    const vol = Volume.fromJSON({});
    const memfs = createFsFromVolume(vol);

    const context: DeepPartial<LocalContext> = {
        process: {
            stdout,
            stderr,
            cwd,
            versions: {
                node: "20.0.0",
            },
        },
        fs: memfs as any,
        path: nodePath,
    };

    await run(app, inputs, context as LocalContext);

    return {
        stdout: stdout.text,
        stderr: stderr.text,
        files: vol.toJSON(),
    };
}

describe("creates new application", () => {
    describe("single-command", () => {
        describe("module [default]", () => {
            it("with default flags", async function () {
                const result = await testApplication(["test", "--template", "single"], { cwd: "/root" });
                compareToBaseline(this, ApplicationTestResultFormat, result);
            });

            describe("package properties", () => {
                it("custom name", async function () {
                    const result = await testApplication(["test", "--template", "single", "--name", "@org/test-cli"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom bin command", async function () {
                    const result = await testApplication(["test", "--template", "single", "--command", "test-cli"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom name and bin command", async function () {
                    const result = await testApplication(
                        ["test", "--template", "single", "--name", "@org/test-cli", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom metadata", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "single",
                            "--description",
                            "Test CLI",
                            "--license",
                            "UNLICENSED",
                            "--author",
                            "Sample Author",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async function () {
                    const result = await testApplication(["test", "--template", "single", "--no-auto-complete"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async function () {
                const result = await testApplication(["test", "--template", "single", "--type", "commonjs"], {
                    cwd: "/root",
                });
                compareToBaseline(this, ApplicationTestResultFormat, result);
            });

            describe("package properties", () => {
                it("custom name", async function () {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--name", "@org/test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom bin command", async function () {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom name and bin command", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "single",
                            "--type",
                            "commonjs",
                            "--name",
                            "@org/test-cli",
                            "--command",
                            "test-cli",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom metadata", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "single",
                            "--type",
                            "commonjs",
                            "--description",
                            "Test CLI",
                            "--license",
                            "UNLICENSED",
                            "--author",
                            "Sample Author",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async function () {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--no-auto-complete"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });
        });
    });

    describe("multi-command", () => {
        describe("module [default]", () => {
            it("with default flags", async function () {
                const result = await testApplication(["test", "--template", "multi"], { cwd: "/root" });
                compareToBaseline(this, ApplicationTestResultFormat, result);
            });

            describe("package properties", () => {
                it("custom name", async function () {
                    const result = await testApplication(["test", "--template", "multi", "--name", "@org/test-cli"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom bin command", async function () {
                    const result = await testApplication(["test", "--template", "multi", "--command", "test-cli"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom name and bin command", async function () {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--name", "@org/test-cli", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom metadata", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "multi",
                            "--description",
                            "Test CLI",
                            "--license",
                            "UNLICENSED",
                            "--author",
                            "Sample Author",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async function () {
                    const result = await testApplication(["test", "--template", "multi", "--no-auto-complete"], {
                        cwd: "/root",
                    });
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async function () {
                const result = await testApplication(["test", "--template", "multi", "--type", "commonjs"], {
                    cwd: "/root",
                });
                compareToBaseline(this, ApplicationTestResultFormat, result);
            });

            describe("package properties", () => {
                it("custom name", async function () {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--name", "@org/test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom bin command", async function () {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom name and bin command", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "multi",
                            "--type",
                            "commonjs",
                            "--name",
                            "@org/test-cli",
                            "--command",
                            "test-cli",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });

                it("custom metadata", async function () {
                    const result = await testApplication(
                        [
                            "test",
                            "--template",
                            "multi",
                            "--type",
                            "commonjs",
                            "--description",
                            "Test CLI",
                            "--license",
                            "UNLICENSED",
                            "--author",
                            "Sample Author",
                        ],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async function () {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--no-auto-complete"],
                        { cwd: "/root" },
                    );
                    compareToBaseline(this, ApplicationTestResultFormat, result);
                });
            });
        });
    });

    describe("node version logic", () => {
        it("use major from process.versions.node", async function () {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const context: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                    versions: {
                        node: "major.minor.patch",
                    },
                },
                fs: memfs as any,
                path: nodePath,
            };

            await run(app, ["node-version-test"], context as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            compareToBaseline(this, ApplicationTestResultFormat, result);
        });

        it("version discovery skipped when --node-version is provided", async function () {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const context: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                    versions: {
                        node: "X.Y.Z",
                    },
                },
                fs: memfs as any,
                path: nodePath,
            };

            await run(app, ["node-version-test", "--node-version", "major.minor.patch"], context as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            compareToBaseline(this, ApplicationTestResultFormat, result);
        });

        it("skips node information in package.json if no node version available", async function () {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const context: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                },
                fs: memfs as any,
                path: nodePath,
            };

            await run(app, ["node-version-test"], context as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            compareToBaseline(this, ApplicationTestResultFormat, result);
        });
    });
});
