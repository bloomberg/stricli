// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { run } from "@stricli/core";
import { describe, expect, it } from "vitest";
import { createFsFromVolume, Volume, type DirectoryJSON } from "memfs";
import nodePath from "node:path";
import sinon from "sinon";
// eslint-disable-next-line no-restricted-imports
import { app } from "../src/app";
// eslint-disable-next-line no-restricted-imports
import type { LocalContext } from "../src/context";
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

async function testApplication(
    inputs: readonly string[],
    options: ApplicationTestOptions,
): Promise<ApplicationTestResult> {
    const stdout = new FakeWritableStream();
    const stderr = new FakeWritableStream();
    const cwd = sinon.stub().returns(options.cwd);
    const vol = Volume.fromJSON({});
    const memfs = createFsFromVolume(vol);

    const localContext: DeepPartial<LocalContext> = {
        process: {
            stdout,
            stderr,
            cwd,
            versions: {
                node: "20.0.0",
            },
        },
        fs: memfs,
        path: nodePath,
    };

    await run(app, inputs, localContext as LocalContext);

    return {
        stdout: stdout.text,
        stderr: stderr.text,
        files: vol.toJSON(),
    };
}

describe("creates new application", () => {
    describe("single-command", () => {
        describe("module [default]", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "single"], { cwd: "/root" });
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(["test", "--template", "single", "--name", "@org/test-cli"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(["test", "--template", "single", "--command", "test-cli"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--name", "@org/test-cli", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom metadata", async () => {
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
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(["test", "--template", "single", "--no-auto-complete"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "single", "--type", "commonjs"], {
                    cwd: "/root",
                });
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--name", "@org/test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
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
                    expect(result).toMatchSnapshot();
                });

                it("custom metadata", async () => {
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
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--no-auto-complete"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });
            });
        });
    });

    describe("multi-command", () => {
        describe("module [default]", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "multi"], { cwd: "/root" });
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--name", "@org/test-cli"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--command", "test-cli"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--name", "@org/test-cli", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom metadata", async () => {
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
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--no-auto-complete"], {
                        cwd: "/root",
                    });
                    expect(result).toMatchSnapshot();
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "multi", "--type", "commonjs"], {
                    cwd: "/root",
                });
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--name", "@org/test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--command", "test-cli"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
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
                    expect(result).toMatchSnapshot();
                });

                it("custom metadata", async () => {
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
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--no-auto-complete"],
                        { cwd: "/root" },
                    );
                    expect(result).toMatchSnapshot();
                });
            });
        });
    });

    describe("node version logic", () => {
        it("use major from process.versions.node", async () => {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const localContext: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                    versions: {
                        node: "major.minor.patch",
                    },
                },
                fs: memfs,
                path: nodePath,
            };

            await run(app, ["node-version-test"], localContext as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            expect(result).toMatchSnapshot();
        });

        it("version discovery skipped when --node-version is provided", async () => {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const localContext: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                    versions: {
                        node: "X.Y.Z",
                    },
                },
                fs: memfs,
                path: nodePath,
            };

            await run(app, ["node-version-test", "--node-version", "major.minor.patch"], localContext as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            expect(result).toMatchSnapshot();
        });

        it("skips node information in package.json if no node version available", async () => {
            const stdout = new FakeWritableStream();
            const stderr = new FakeWritableStream();
            const cwd = sinon.stub().returns("/home");
            const vol = Volume.fromJSON({});
            const memfs = createFsFromVolume(vol);

            const localContext: DeepPartial<LocalContext> = {
                process: {
                    stdout,
                    stderr,
                    cwd,
                },
                fs: memfs,
                path: nodePath,
            };

            await run(app, ["node-version-test"], localContext as LocalContext);

            const result = {
                stdout: stdout.text,
                stderr: stderr.text,
                files: vol.toJSON(),
            };
            expect(result).toMatchSnapshot();
        });
    });
});
