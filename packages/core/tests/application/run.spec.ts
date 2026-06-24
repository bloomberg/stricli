// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    buildApplication,
    buildCommand,
    ExitCode,
    numberParser,
    run,
    text_en,
    type Application,
    type ApplicationContext,
    type CommandContext,
    type VersionInfo,
} from "../../src";
import { buildBasicCommand, buildBasicRouteMap, buildRouteMapForFakeContext } from "../application";
import { buildFakeContext } from "../fakes/context";
import { runResultSerializer, type ApplicationRunResult } from "../snapshot-serializers";

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

describe("run", () => {
    describe("basic command at root", () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root, no color depth", async () => {
            const result = await runWithInputs(app, ["--help"], { colorDepth: void 0 });
            expect(result).toMatchSnapshot();
        });

        it("display help text for root, color depth < 4", async () => {
            const result = await runWithInputs(app, ["--help"], { colorDepth: 2 });
            expect(result).toMatchSnapshot();
        });

        it("display help text for root, color depth > 4", async () => {
            const result = await runWithInputs(app, ["--help"], { colorDepth: 8 });
            expect(result).toMatchSnapshot();
        });

        it("display help text for root (with flag alias)", async () => {
            const result = await runWithInputs(app, ["-h"]);
            expect(result).toMatchSnapshot();
        });

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
                const result = await runWithInputs(app, ["--help"]);
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

        describe("with custom usage", () => {
            const commandWithAlternateUsage = buildCommand({
                loader: async () => {
                    return {
                        default: async () => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {},
                },
                docs: {
                    brief: "basic command",
                    customUsage: [
                        "custom usage 1",
                        { input: "custom-two", brief: "enhanced custom usage 2" },
                        "custom usage 3",
                    ],
                },
            });
            const appWithAlternateUsage = buildApplication(commandWithAlternateUsage, {
                name: "cli",
            });

            it("display help text for root", async () => {
                const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with full description", () => {
            const commandWithAlternateUsage = buildCommand({
                loader: async () => {
                    return {
                        default: async () => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {},
                },
                docs: {
                    brief: "basic command",
                    fullDescription: "This is a full description\nof this command's behavior.",
                },
            });
            const appWithAlternateUsage = buildApplication(commandWithAlternateUsage, {
                name: "cli",
            });

            it("display help text for root", async () => {
                const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("basic route map at root", () => {
        // GIVEN
        const routeMap = buildBasicRouteMap("root");
        const app = buildApplication(routeMap, {
            name: "cli",
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root (with flag alias)", async () => {
            const result = await runWithInputs(app, ["-h"]);
            expect(result).toMatchSnapshot();
        });

        describe("with current version as static string", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(routeMap, {
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

        describe("with current version as async callback", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                getCurrentVersion: async () => "1.0.0",
            };
            const appWithCurrentVersion = buildApplication(routeMap, {
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
            const appWithUpToDateVersion = buildApplication(routeMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("display help text for root, no warning", async () => {
                const result = await runWithInputs(appWithUpToDateVersion, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version", async () => {
                const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with outdated version info", () => {
            // GIVEN
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
                getLatestVersion: async () => "1.1.0",
            };
            const appWithOutdatedVersion = buildApplication(routeMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            it("display help text for root, warn on outdated version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for subcommand, warn on outdated version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });

            it("request current version", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, skip check with env var defined", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                    env: {
                        STRICLI_SKIP_VERSION_CHECK: "",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, do not skip check with env var set to 0", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                    env: {
                        STRICLI_SKIP_VERSION_CHECK: "0",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, do not skip check with env var set to yes", async () => {
                const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                    env: {
                        STRICLI_SKIP_VERSION_CHECK: "yes",
                    },
                });
                expect(result).toMatchSnapshot();
            });

            describe("and upgrade command", () => {
                // GIVEN
                const versionInfo: VersionInfo = {
                    currentVersion: "1.0.0",
                    getLatestVersion: async () => "1.1.0",
                    upgradeCommand: "<upgrade-command>",
                };
                const appWithOutdatedVersionAndUpgradeCommand = buildApplication(routeMap, {
                    name: "cli",
                    versionInfo,
                });

                // WHEN
                it("display help text for root, warn on outdated version", async () => {
                    const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("display help text for subcommand, warn on outdated version", async () => {
                    const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["command", "--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async () => {
                    const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--version"]);
                    expect(result).toMatchSnapshot();
                });
            });
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route, with no ansi color", async () => {
            const result = await runWithInputs(app, ["undefined"], { colorDepth: void 0 });
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route, proposes similar alternative", async () => {
            const result = await runWithInputs(app, ["commandx"]);
            expect(result).toMatchSnapshot();
        });

        describe("with custom distance threshold", () => {
            const appWithCustomDistanceThreshold = buildApplication(routeMap, {
                name: "cli",
                scanner: {
                    distanceOptions: {
                        threshold: 10,
                        weights: {
                            insertion: 1,
                            deletion: 3,
                            substitution: 2,
                            transposition: 0,
                        },
                    },
                },
            });

            it("fails for undefined route, proposes similar alternative", async () => {
                const result = await runWithInputs(appWithCustomDistanceThreshold, ["commandxyz"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with allow-kebab-for-camel", () => {
            const appWithCustomDistanceThreshold = buildApplication(routeMap, {
                name: "cli",
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
            });

            it("fails for undefined route, proposes similar alternative", async () => {
                const result = await runWithInputs(appWithCustomDistanceThreshold, ["commandxyz"]);
                expect(result).toMatchSnapshot();
            });
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("runs subcommand directly with no arguments", async () => {
            const result = await runWithInputs(app, ["command"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for subcommand", async () => {
            const result = await runWithInputs(app, ["command", "--help"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for subcommand (with flag alias)", async () => {
            const result = await runWithInputs(app, ["command", "-h"]);
            expect(result).toMatchSnapshot();
        });

        describe("with full description", () => {
            const routeMapWithCustomUsage = buildRouteMapForFakeContext({
                routes: {
                    command: buildBasicCommand(),
                },
                docs: {
                    brief: "basic route map",
                    fullDescription: "This is a full description\nof this route map's behavior.",
                },
            });
            const appWithAlternateUsage = buildApplication(routeMapWithCustomUsage, {
                name: "cli",
            });

            it("display help text for root", async () => {
                const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("route map with default command at root", () => {
        // GIVEN
        const routeMap = buildRouteMapForFakeContext({
            routes: {
                default: buildBasicCommand(),
                alternate: buildBasicCommand(),
            },
            defaultCommand: "default",
            docs: {
                brief: "route map with default command brief",
            },
        });
        const app = buildApplication(routeMap, {
            name: "cli",
        });

        // WHEN
        it("runs default command (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root (with flag alias)", async () => {
            const result = await runWithInputs(app, ["-h"]);
            expect(result).toMatchSnapshot();
        });

        it("passes undefined route as argument to default command", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("passes similar route as argument to default command", async () => {
            const result = await runWithInputs(app, ["commandx"]);
            expect(result).toMatchSnapshot();
        });

        it("passes undefined flag to default command", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("runs subcommand directly with no arguments", async () => {
            const result = await runWithInputs(app, ["default"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for default command", async () => {
            const result = await runWithInputs(app, ["default", "--help"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for default command (with flag alias)", async () => {
            const result = await runWithInputs(app, ["default", "-h"]);
            expect(result).toMatchSnapshot();
        });

        it("runs subcommand directly with default route name as argument", async () => {
            const result = await runWithInputs(app, ["default", "default"]);
            expect(result).toMatchSnapshot();
        });

        it("runs subcommand directly with alternate route name as argument", async () => {
            const result = await runWithInputs(app, ["default", "alternate"]);
            expect(result).toMatchSnapshot();
        });

        describe("with full description", () => {
            const routeMapWithCustomUsage = buildRouteMapForFakeContext({
                routes: {
                    command: buildBasicCommand(),
                },
                docs: {
                    brief: "basic route map",
                    fullDescription: "This is a full description\nof this route map's behavior.",
                },
            });
            const appWithAlternateUsage = buildApplication(routeMapWithCustomUsage, {
                name: "cli",
            });

            it("display help text for root", async () => {
                const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("nested basic route map at root", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: buildBasicRouteMap("sub") },
            docs: { brief: "root route map" },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map (implicit)", async () => {
            const result = await runWithInputs(app, ["sub"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map", async () => {
            const result = await runWithInputs(app, ["sub", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("nested basic route map with route alias at root", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: buildBasicRouteMap("sub") },
            aliases: {
                alias: "sub",
            },
            docs: { brief: "root route map" },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            completion: {
                includeAliases: true,
            },
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for alias-adjacent route", async () => {
            const result = await runWithInputs(app, ["aliasX"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map with route alias", async () => {
            const result = await runWithInputs(app, ["sub"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias (implicit)", async () => {
            const result = await runWithInputs(app, ["alias"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias", async () => {
            const result = await runWithInputs(app, ["alias", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("nested basic route map with camelCase route aliases at root", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: buildBasicRouteMap("sub") },
            aliases: {
                aliasFoo: "sub",
                aliasBar: "sub",
            },
            docs: { brief: "root route map" },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            scanner: {
                caseStyle: "allow-kebab-for-camel",
            },
            completion: {
                includeAliases: true,
            },
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for alias-adjacent route", async () => {
            const result = await runWithInputs(app, ["aliasX"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map with route alias", async () => {
            const result = await runWithInputs(app, ["sub"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias (implicit)", async () => {
            const result = await runWithInputs(app, ["aliasFoo"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias", async () => {
            const result = await runWithInputs(app, ["aliasFoo", "--help"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias kebab-case version (implicit)", async () => {
            const result = await runWithInputs(app, ["alias-foo"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested route map via route alias kebab-case version", async () => {
            const result = await runWithInputs(app, ["alias-foo", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    it("prints unexpected error from version integration to stderr", async () => {
        // GIVEN
        const error = new Error("This function purposefully throws an error");
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
            getLatestVersion: async () => {
                throw error;
            },
        };
        const routeMap = buildBasicRouteMap("root");
        const app = buildApplication(routeMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const result = await runWithInputs(app, [], { forCommand: false });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("runs command with original context", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], { forCommand: false });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("fails when context.forCommand throws error", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], {
            forCommand: () => {
                throw new Error("This function purposefully throws an error");
            },
            colorDepth: 4,
        });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("fails when context.forCommand throws error, with no ansi color", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], {
            forCommand: () => {
                throw new Error("This function purposefully throws an error");
            },
            colorDepth: void 0,
        });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("fails when context.forCommand throws error, with custom exception formatting", async (context) => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
            localization: {
                loadText() {
                    return {
                        ...text_en,
                        formatException() {
                            return "FORMATTED_EXCEPTION";
                        },
                    };
                },
            },
        });

        // WHEN
        const result = await runWithInputs(app, [], {
            forCommand: () => {
                throw new Error("This function purposefully throws an error");
            },
            colorDepth: void 0,
        });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("fails when context.forCommand throws error (without stack)", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], {
            forCommand: () => {
                const error = new Error("This function purposefully throws an error");
                error.stack = void 0;
                throw error;
            },
            colorDepth: 4,
        });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("fails when context.forCommand throws non-error", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], {
            forCommand: () => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw "This function purposefully throws an error";
            },
            colorDepth: 4,
        });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("loads text for context locale", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
        });

        // WHEN
        const result = await runWithInputs(app, [], { locale: "en" });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("uses default text when no text loaded for unsupported context locale", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
            localization: {
                loadText: (locale) => {
                    return { en: text_en }[locale];
                },
            },
        });

        // WHEN
        const result = await runWithInputs(app, [], { locale: "other", colorDepth: 4 });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("uses default text when no text loaded for unsupported context locale, with no ansi color", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
            localization: {
                loadText: (locale) => {
                    return { en: text_en }[locale];
                },
            },
        });

        // WHEN
        const result = await runWithInputs(app, [], { locale: "other" });

        // THEN
        expect(result).toMatchSnapshot();
    });

    it("uses provided text, disregards unsupported context locale", async (context) => {
        // GIVEN
        const command = buildBasicCommand();
        const app = buildApplication(command, {
            name: "cli",
            localization: {
                text: text_en,
            },
        });

        // WHEN
        const result = await runWithInputs(app, [], { locale: "other", colorDepth: 4 });

        // THEN
        expect(result).toMatchSnapshot();
    });

    describe("nested basic route map with hidden routes", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                sub: buildBasicRouteMap("sub"),
                subHidden: buildBasicRouteMap("subHidden"),
            },
            docs: {
                brief: "root route map",
                hideRoute: {
                    subHidden: true,
                },
            },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root including hidden", async () => {
            const result = await runWithInputs(app, ["--helpAll"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for disallowed flag case style", async () => {
            const result = await runWithInputs(app, ["--help-all"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map (implicit)", async () => {
            const result = await runWithInputs(app, ["subHidden"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map", async () => {
            const result = await runWithInputs(app, ["subHidden", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("nested basic route map with hidden routes, always show help-all", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                sub: buildBasicRouteMap("sub"),
                subHidden: buildBasicRouteMap("subHidden"),
            },
            docs: {
                brief: "root route map",
                hideRoute: {
                    subHidden: true,
                },
            },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            documentation: {
                alwaysShowHelpAllFlag: true,
            },
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root including hidden", async () => {
            const result = await runWithInputs(app, ["--helpAll"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for disallowed flag case style", async () => {
            const result = await runWithInputs(app, ["--help-all"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map (implicit)", async () => {
            const result = await runWithInputs(app, ["subHidden"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map", async () => {
            const result = await runWithInputs(app, ["subHidden", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("nested basic route map with hidden routes, always show help-all (alias)", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                sub: buildBasicRouteMap("sub"),
                subHidden: buildBasicRouteMap("subHidden"),
            },
            docs: {
                brief: "root route map",
                hideRoute: {
                    subHidden: true,
                },
            },
        });
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            documentation: {
                alwaysShowHelpAllFlag: true,
                useAliasInUsageLine: true,
            },
        });

        // WHEN
        it("display help text for root (implicit)", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });

        it("display help text for root including hidden", async () => {
            const result = await runWithInputs(app, ["--helpAll"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for disallowed flag case style", async () => {
            const result = await runWithInputs(app, ["--help-all"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined route", async () => {
            const result = await runWithInputs(app, ["undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("fails for undefined flag", async () => {
            const result = await runWithInputs(app, ["--undefined"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map (implicit)", async () => {
            const result = await runWithInputs(app, ["subHidden"]);
            expect(result).toMatchSnapshot();
        });

        it("displays help text for nested hidden route map", async () => {
            const result = await runWithInputs(app, ["subHidden", "--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("sets exit code", () => {
        const echoExitCodeCommand = buildCommand({
            func: function (this: ApplicationContext, { fail, exitCode }: { fail: boolean; exitCode: number }) {
                this.process.exitCode = exitCode;
                if (fail) {
                    throw new Error(`Command failed with exit code ${exitCode}`);
                }
            },
            docs: {
                brief: "Echoes the provided exit code by setting it on the context's process",
            },
            parameters: {
                flags: {
                    fail: {
                        brief: "Whether to throw an error after setting the exit code",
                        kind: "boolean",
                        default: false,
                    },
                    exitCode: {
                        kind: "parsed",
                        brief: "Exit code to set",
                        parse: numberParser,
                    },
                },
            },
        });
        const echoExitCodeApp = buildApplication(echoExitCodeCommand, {
            name: "cli",
            documentation: {
                alwaysShowHelpAllFlag: true,
                useAliasInUsageLine: true,
            },
        });

        it("to Success when no error thrown", async () => {
            const result = await runWithInputs(echoExitCodeApp, ["--exitCode", `${ExitCode.Success}`]);
            expect(result).toMatchSnapshot();
        });

        it("to Success, even if error is thrown", async () => {
            const result = await runWithInputs(echoExitCodeApp, ["--exitCode", `${ExitCode.Success}`, "--fail"]);
            expect(result).toMatchSnapshot();
        });

        it("to CommandRunError when no error thrown", async () => {
            const result = await runWithInputs(echoExitCodeApp, ["--exitCode", `${ExitCode.CommandRunError}`]);
            expect(result).toMatchSnapshot();
        });

        it("to CommandRunError, even if error is thrown", async () => {
            const result = await runWithInputs(echoExitCodeApp, [
                "--exitCode",
                `${ExitCode.CommandRunError}`,
                "--fail",
            ]);
            expect(result).toMatchSnapshot();
        });
    });
});
