// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    buildApplication,
    help,
    run,
    text_en,
    version,
    type Application,
    type CommandContext,
    type VersionInfo,
} from "../../../src";
import { runResultSerializer, type ApplicationRunResult } from "../../snapshot-serializers";
import { buildFakeContext } from "../../fakes/context";
import { buildBasicCommand } from "../../application";

// Register custom snapshot serializers
expect.addSnapshotSerializer(runResultSerializer);

async function runWithInputs(
    app: Application<CommandContext>,
    inputs: readonly string[],
    ...args: Parameters<typeof buildFakeContext>
): Promise<ApplicationRunResult> {
    const context = buildFakeContext(...args);
    await run(app, inputs, context);
    return {
        stdout: context.process.stdout.write.args.map(([text]) => text).join(""),
        stderr: context.process.stderr.write.args.map(([text]) => text).join(""),
        exitCode: context.process.exitCode,
    };
}

describe("version integration", () => {
    describe("via config (default integration)", () => {
        const command = buildBasicCommand();

        describe("with current version (as static string)", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("request current version", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version (with flag alias)", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with current version (as async callback)", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                getCurrentVersion: async () => "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("request current version", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version (with flag alias)", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with up-to-date version info", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
                getLatestVersion: async () => "1.0.0",
            };
            const appWithUpToDateVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("request current version", async () => {
                const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with missing latest version info", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
                getLatestVersion: async () => void 0,
            };
            const appWithUpToDateVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("display help text for root", async () => {
                const result = await runWithInputs(appWithUpToDateVersion, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version", async () => {
                const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with outdated version info (as static string)", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
                getLatestVersion: async () => "1.1.0",
            };
            const appWithOutdatedVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("display help text for root, warn on outdated version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, warn on outdated version, with no ansi color", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"], { colorDepth: void 0 });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, warn on outdated version, no ansi color with env var", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                    colorDepth: void 0,
                    env: {
                        STRICLI_NO_COLOR: "",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, warn on outdated version, ansi color with env var set to 0", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                    colorDepth: void 0,
                    env: {
                        STRICLI_NO_COLOR: "0",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, warn on outdated version, ansi color with env var set to yes", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                    colorDepth: void 0,
                    env: {
                        STRICLI_NO_COLOR: "yes",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            it("request current version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with outdated version info (as async callback)", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                getCurrentVersion: async () => "1.0.0",
                getLatestVersion: async () => "1.1.0",
            };
            const appWithOutdatedVersion = buildApplication(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("display help text for root, warn on outdated version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("via integration args", () => {
        const root = buildBasicCommand();

        describe("default values", () => {
            describe("with current version (as static string)", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    currentVersion: "1.0.0",
                };
                const appWithCurrentVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async () => {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    expect(result).toMatchSnapshot();
                });
            });

            describe("with current version (as async callback)", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    getCurrentVersion: async () => "1.0.0",
                };
                const appWithCurrentVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async () => {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    expect(result).toMatchSnapshot();
                });
            });

            describe("with up-to-date version info", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    currentVersion: "1.0.0",
                    getLatestVersion: async () => "1.0.0",
                };
                const appWithUpToDateVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });
            });

            describe("with missing latest version info", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    currentVersion: "1.0.0",
                    getLatestVersion: async () => void 0,
                };
                const appWithUpToDateVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });
            });

            describe("with outdated version info (as static string)", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    currentVersion: "1.0.0",
                    getLatestVersion: async () => "1.1.0",
                };
                const appWithOutdatedVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });
            });

            describe("with outdated version info (as async callback)", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    getCurrentVersion: async () => "1.0.0",
                    getLatestVersion: async () => "1.1.0",
                };
                const appWithOutdatedVersion = buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    { version: version({ info: versionInfo, brief: text_en.briefs.version }) },
                );

                // WHEN
                it("request current version", async () => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });
            });
        });

        describe("with no alias", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(
                root,
                {
                    name: "cli",
                },
                {
                    version: version({ info: versionInfo, brief: text_en.briefs.version, alias: false }),
                    help: help({
                        brief: text_en.briefs.help,
                        formatting: {
                            caseStyle: "original",
                            onlyRequiredInUsageLine: false,
                            useAliasInUsageLine: false,
                        },
                    }),
                },
            );

            // WHEN
            it("request current version", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });

            it("fails on missing flag", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with alternate alias", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(
                root,
                {
                    name: "cli",
                },
                {
                    version: version({ info: versionInfo, brief: text_en.briefs.version, alias: "V" }),
                    help: help({
                        brief: text_en.briefs.help,
                        formatting: {
                            caseStyle: "original",
                            onlyRequiredInUsageLine: false,
                            useAliasInUsageLine: false,
                        },
                    }),
                },
            );

            // WHEN
            it("request current version", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version (with correct flag alias)", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["-V"]);
                expect(result).toMatchSnapshot();
            });

            it("fails on missing flag (with incorrect flag alias)", async () => {
                const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                expect(result).toMatchSnapshot();
            });
        });
    });
});
