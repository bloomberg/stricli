// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { run } from "@stricli/core";
import { buildFakeProcess, buildWorkspaceResultSerializer, type WorkspaceResult } from "@stricli/test.utils";
import { createFsFromVolume, Volume } from "memfs";
import nodePath from "node:path";
import url from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };
// eslint-disable-next-line no-restricted-imports
import { app } from "../src/app";
// eslint-disable-next-line no-restricted-imports
import type { LocalContext } from "../src/context";
import type { DeepPartial } from "./types";

// Register custom snapshot serializer for ApplicationTestResult
expect.addSnapshotSerializer(buildWorkspaceResultSerializer({
    root: new url.URL("..", import.meta.url),
    packageVersion: packageJson.version,
}));

async function testApplication(
    inputs: readonly string[],
    processOverrides: Partial<LocalContext["process"]> = {},
): Promise<WorkspaceResult> {
    const vol = Volume.fromJSON({});
    const memfs = createFsFromVolume(vol);

    const localContext = {
        process: {
            ...buildFakeProcess(),
            ...processOverrides,
            cwd: () => "/root",
        },
        fs: memfs,
        path: nodePath,
    } satisfies DeepPartial<LocalContext>;

    await run(app, inputs, localContext as unknown as LocalContext);

    return {
        process: localContext.process,
        files: vol.toJSON(),
    };
}

describe("creates new application", () => {
    describe("single-command", () => {
        describe("module [default]", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "single"]);
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(["test", "--template", "single", "--name", "@org/test-cli"]);
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(["test", "--template", "single", "--command", "test-cli"]);
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--name", "@org/test-cli", "--command", "test-cli"],
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
                    );
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(["test", "--template", "single", "--no-auto-complete"]);
                    expect(result).toMatchSnapshot();
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "single", "--type", "commonjs"]);
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--name", "@org/test-cli"],
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--command", "test-cli"],
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
                    );
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(
                        ["test", "--template", "single", "--type", "commonjs", "--no-auto-complete"],
                    );
                    expect(result).toMatchSnapshot();
                });
            });
        });
    });

    describe("multi-command", () => {
        describe("module [default]", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "multi"]);
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--name", "@org/test-cli"]);
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--command", "test-cli"]);
                    expect(result).toMatchSnapshot();
                });

                it("custom name and bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--name", "@org/test-cli", "--command", "test-cli"],
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
                    );
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(["test", "--template", "multi", "--no-auto-complete"]);
                    expect(result).toMatchSnapshot();
                });
            });
        });

        describe("commonjs", () => {
            it("with default flags", async () => {
                const result = await testApplication(["test", "--template", "multi", "--type", "commonjs"]);
                expect(result).toMatchSnapshot();
            });

            describe("package properties", () => {
                it("custom name", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--name", "@org/test-cli"],
                    );
                    expect(result).toMatchSnapshot();
                });

                it("custom bin command", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--command", "test-cli"],
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
                    );
                    expect(result).toMatchSnapshot();
                });
            });

            describe("additional features", () => {
                it("without auto-complete", async () => {
                    const result = await testApplication(
                        ["test", "--template", "multi", "--type", "commonjs", "--no-auto-complete"],
                    );
                    expect(result).toMatchSnapshot();
                });
            });
        });
    });

    describe("node version logic", () => {
        it("use major from process.versions.node", async () => {
            const result = await testApplication(["node-version-test"], {
                versions: {
                    node: "major.minor.patch",
                },
            });
            expect(result).toMatchSnapshot();
        });

        it("version discovery skipped when --node-version is provided", async () => {
            const result = await testApplication(["node-version-test", "--node-version", "major.minor.patch"], {
                versions: {
                    node: "major.minor.patch",
                },
            });
            expect(result).toMatchSnapshot();
        });

        it("skips node information in package.json if no node version available", async () => {
            const result = await testApplication(["node-version-test", "--node-version", "major.minor.patch"], {
                versions: {},
            });
            expect(result).toMatchSnapshot();
        });
    });
});
