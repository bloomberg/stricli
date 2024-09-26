import { run } from "@stricli/core";
import { expect } from "chai";
import { createFsFromVolume, Volume, type DirectoryJSON } from "memfs";
import nodePath from "node:path";
import sinon from "sinon";
import { app } from "../src/app";
import { type LocalContext } from "../src/context";
import { compareToBaseline, type BaselineFormat } from "./baseline";
import { FakeWritableStream } from "./stream";
import type { DeepPartial } from "./types";

interface ApplicationTestOptions {
    readonly cwd: string;
}

interface ApplicationTestResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly files: DirectoryJSON;
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
        const stdout = lines.slice(stdoutStartIdx + 1, stderrStartIdx - 1).join("\n");
        const stderr = lines.slice(stderrStartIdx + 1, filesStartIdx - 1).join("\n");
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
        yield result.stderr;
        yield "[FILES]";
        const fileEntries = Object.entries(result.files).sort((a, b) => a[0].localeCompare(b[0]));
        for (const [path, text] of fileEntries) {
            if (text) {
                yield `${FILE_ENTRY_PREFIX}${path}`;
                yield text.toString();
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
});
