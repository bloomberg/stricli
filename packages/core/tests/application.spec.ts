// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "vitest";
import { describe, it } from "vitest";
import {
    buildApplication,
    buildCommand,
    buildRouteMap,
    generateHelpTextForAllCommands,
    numberParser,
    proposeCompletions,
    run,
    text_en,
    type Application,
    type CommandContext,
    type InputCompletion,
    type RouteMapBuilderArguments,
    type VersionInfo,
} from "../src";
import { buildFakeApplicationText } from "./fakes/config";
import { buildFakeContext, type FakeContext } from "./fakes/context";
import { runResultSerializer, documentedCommandArraySerializer } from "./snapshot-serializers";

// Register custom snapshot serializers
expect.addSnapshotSerializer(runResultSerializer);
expect.addSnapshotSerializer(documentedCommandArraySerializer);

function testCompletions(app: Application<FakeContext>, inputs: string[], expected: readonly InputCompletion[]) {
    const line = inputs.join(" ");
    describe(`proposes [${expected.map(({ completion }) => completion).join()}] for "${line}"`, () => {
        it("static context", async () => {
            const context = buildFakeContext({ forCommand: false, colorDepth: 2 });
            const completions = await proposeCompletions(app, inputs, context);
            expect(completions).to.have.deep.members(expected);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });

        it("dynamic context", async () => {
            const context = buildFakeContext({ forCommand: true, colorDepth: 2 });
            const completions = await proposeCompletions(app, inputs, context);
            expect(completions).to.have.deep.members(expected);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });

        it("error loading context", async () => {
            const context = buildFakeContext({
                forCommand: () => {
                    throw new Error("This function purposefully throws an error");
                },
                colorDepth: void 0,
            });
            await proposeCompletions(app, inputs, context);
            const completions = context.process.stdout.write.args.flat(2)[0]?.split("\n") ?? [];
            expect(completions).to.have.deep.members([]);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });
    });
}

function buildRouteMapForFakeContext<R extends string>(args: RouteMapBuilderArguments<R, CommandContext>) {
    return buildRouteMap(args);
}

function buildBasicCommand() {
    return buildCommand({
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
        },
    });
}

function buildBasicRouteMap(brief: string) {
    return buildRouteMapForFakeContext({
        routes: {
            command: buildBasicCommand(),
        },
        docs: {
            brief,
        },
    });
}

export interface ApplicationRunResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | string | null | undefined;
}

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

describe("Application", () => {
    describe("buildApplication", () => {
        it("allows `allow-kebab-for-camel` parse case style with `original` display case style", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
                documentation: {
                    caseStyle: "original",
                },
            });
        });

        it("fails on `original` parse case style with `convert-camel-to-kebab` display case style", async () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            expect(() =>
                buildApplication(rootRouteMap, {
                    name: "cli",
                    versionInfo,
                    scanner: {
                        caseStyle: "original",
                    },
                    documentation: {
                        caseStyle: "convert-camel-to-kebab",
                    },
                }),
            ).to.throw("Cannot convert route and flag names on display but scan as original");
        });

        it("allows root command using --version flag without version info", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: { version: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        version: {
                            brief: "version",
                            kind: "boolean",
                        },
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });

            // WHEN
            buildApplication(command, {
                name: "cli",
            });
        });

        it("fails if root command uses --version flag when providing version info", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: { version: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        version: {
                            brief: "version",
                            kind: "boolean",
                        },
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    versionInfo,
                }),
            ).to.throw("Unable to use command with flag --version as root when version info is supplied");
        });

        it("allows root command using -v alias without version info", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: { verbose: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        verbose: {
                            brief: "verbose",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        v: "verbose",
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });

            // WHEN
            buildApplication(command, {
                name: "cli",
            });
        });

        it("fails if root command uses -v alias when providing version info", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: { verbose: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        verbose: {
                            brief: "verbose",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        v: "verbose",
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    versionInfo,
                }),
            ).to.throw("Unable to use command with alias -v as root when version info is supplied");
        });

        it("fails if no text for default locale", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: {}) => {},
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
                },
            });

            // WHEN
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    localization: {
                        loadText: (): undefined => {
                            return;
                        },
                    },
                }),
            ).to.throw('No text available for the default locale "en"');
        });

        it("fails if no text for custom default locale", async () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: async (flags: {}) => {},
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
                },
            });

            // WHEN
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    localization: {
                        defaultLocale: "eo",
                        loadText: (): undefined => {
                            return;
                        },
                    },
                }),
            ).to.throw('No text available for the default locale "eo"');
        });
    });

    describe("run", () => {
        describe("basic command at root", () => {
            // GIVEN
            const command = buildBasicCommand();
            const app = buildApplication(command, {
                name: "cli",
            });

            // WHEN
            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, no color depth", async (context) => {
                const result = await runWithInputs(app, ["--help"], { colorDepth: void 0 });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, color depth < 4", async (context) => {
                const result = await runWithInputs(app, ["--help"], { colorDepth: 2 });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root, color depth > 4", async (context) => {
                const result = await runWithInputs(app, ["--help"], { colorDepth: 8 });
                expect(result).toMatchSnapshot();
            });

            it("display help text for root (with flag alias)", async (context) => {
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
                it("request current version", async (context) => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async (context) => {
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
                it("request current version", async (context) => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async (context) => {
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
                it("request current version", async (context) => {
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
                it("display help text for root", async (context) => {
                    const result = await runWithInputs(app, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async (context) => {
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
                it("display help text for root, warn on outdated version", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("display help text for root, warn on outdated version, with no ansi color", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], { colorDepth: void 0 });
                    expect(result).toMatchSnapshot();
                });

                it("display help text for root, warn on outdated version, no ansi color with env var", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                        colorDepth: void 0,
                        env: {
                            STRICLI_NO_COLOR: "",
                        },
                    });
                    expect(result).toMatchSnapshot();
                });

                it("display help text for root, warn on outdated version, ansi color with env var set to 0", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                        colorDepth: void 0,
                        env: {
                            STRICLI_NO_COLOR: "0",
                        },
                    });
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async (context) => {
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
                it("display help text for root, warn on outdated version", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async (context) => {
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

                it("display help text for root", async (context) => {
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

                it("display help text for root", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root (with flag alias)", async (context) => {
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
                it("request current version", async (context) => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async (context) => {
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
                it("request current version", async (context) => {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version (with flag alias)", async (context) => {
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
                it("display help text for root, no warning", async (context) => {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async (context) => {
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
                it("display help text for root, warn on outdated version", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("display help text for subcommand, warn on outdated version", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["command", "--help"]);
                    expect(result).toMatchSnapshot();
                });

                it("request current version", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    expect(result).toMatchSnapshot();
                });

                it("display help text for root, skip check with env var defined", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                        env: {
                            STRICLI_SKIP_VERSION_CHECK: "",
                        },
                    });
                    expect(result).toMatchSnapshot();
                });

                it("display help text for root, do not skip check with env var set to 0", async (context) => {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                        env: {
                            STRICLI_SKIP_VERSION_CHECK: "0",
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
                    it("display help text for root, warn on outdated version", async (context) => {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--help"]);
                        expect(result).toMatchSnapshot();
                    });

                    it("display help text for subcommand, warn on outdated version", async (context) => {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, [
                            "command",
                            "--help",
                        ]);
                        expect(result).toMatchSnapshot();
                    });

                    it("request current version", async (context) => {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--version"]);
                        expect(result).toMatchSnapshot();
                    });
                });
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route, with no ansi color", async (context) => {
                const result = await runWithInputs(app, ["undefined"], { colorDepth: void 0 });
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route, proposes similar alternative", async (context) => {
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

                it("fails for undefined route, proposes similar alternative", async (context) => {
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

                it("fails for undefined route, proposes similar alternative", async (context) => {
                    const result = await runWithInputs(appWithCustomDistanceThreshold, ["commandxyz"]);
                    expect(result).toMatchSnapshot();
                });
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("runs subcommand directly with no arguments", async (context) => {
                const result = await runWithInputs(app, ["command"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for subcommand", async (context) => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for subcommand (with flag alias)", async (context) => {
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

                it("display help text for root", async (context) => {
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
            it("runs default command (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root (with flag alias)", async (context) => {
                const result = await runWithInputs(app, ["-h"]);
                expect(result).toMatchSnapshot();
            });

            it("passes undefined route as argument to default command", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("passes similar route as argument to default command", async (context) => {
                const result = await runWithInputs(app, ["commandx"]);
                expect(result).toMatchSnapshot();
            });

            it("passes undefined flag to default command", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("runs subcommand directly with no arguments", async (context) => {
                const result = await runWithInputs(app, ["default"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for default command", async (context) => {
                const result = await runWithInputs(app, ["default", "--help"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for default command (with flag alias)", async (context) => {
                const result = await runWithInputs(app, ["default", "-h"]);
                expect(result).toMatchSnapshot();
            });

            it("runs subcommand directly with default route name as argument", async (context) => {
                const result = await runWithInputs(app, ["default", "default"]);
                expect(result).toMatchSnapshot();
            });

            it("runs subcommand directly with alternate route name as argument", async (context) => {
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

                it("display help text for root", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map (implicit)", async (context) => {
                const result = await runWithInputs(app, ["sub"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for alias-adjacent route", async (context) => {
                const result = await runWithInputs(app, ["aliasX"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map with route alias", async (context) => {
                const result = await runWithInputs(app, ["sub"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias (implicit)", async (context) => {
                const result = await runWithInputs(app, ["alias"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for alias-adjacent route", async (context) => {
                const result = await runWithInputs(app, ["aliasX"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map with route alias", async (context) => {
                const result = await runWithInputs(app, ["sub"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias (implicit)", async (context) => {
                const result = await runWithInputs(app, ["aliasFoo"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias", async (context) => {
                const result = await runWithInputs(app, ["aliasFoo", "--help"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias kebab-case version (implicit)", async (context) => {
                const result = await runWithInputs(app, ["alias-foo"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested route map via route alias kebab-case version", async (context) => {
                const result = await runWithInputs(app, ["alias-foo", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        it("does not handle unexpected error in version information", async () => {
            // GIVEN
            const error = new Error("This function purposefully throws an error");
            const versionInfo: VersionInfo = {
                getCurrentVersion: async () => {
                    throw error;
                },
            };
            const routeMap = buildBasicRouteMap("root");
            const app = buildApplication(routeMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const context = buildFakeContext();
            await run(app, ["--version"], context).then(
                () => {
                    throw new Error(`Expected run to throw`);
                },
                (exc: unknown) => {
                    // THEN
                    expect(exc).to.deep.equal(error);
                },
            );
        });

        it("runs command with original context", async (context) => {
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

        it("fails when context.forCommand throws error", async (context) => {
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

        it("fails when context.forCommand throws error, with no ansi color", async (context) => {
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

        it("fails when context.forCommand throws error (without stack)", async (context) => {
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

        it("fails when context.forCommand throws non-error", async (context) => {
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

        it("loads text for context locale", async (context) => {
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

        it("uses default text when no text loaded for unsupported context locale", async (context) => {
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

        it("uses default text when no text loaded for unsupported context locale, with no ansi color", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root including hidden", async (context) => {
                const result = await runWithInputs(app, ["--help-all"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map (implicit)", async (context) => {
                const result = await runWithInputs(app, ["subHidden"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root including hidden", async (context) => {
                const result = await runWithInputs(app, ["--help-all"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map (implicit)", async (context) => {
                const result = await runWithInputs(app, ["subHidden"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map", async (context) => {
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
            it("display help text for root (implicit)", async (context) => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root", async (context) => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("display help text for root including hidden", async (context) => {
                const result = await runWithInputs(app, ["--help-all"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined route", async (context) => {
                const result = await runWithInputs(app, ["undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("fails for undefined flag", async (context) => {
                const result = await runWithInputs(app, ["--undefined"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map (implicit)", async (context) => {
                const result = await runWithInputs(app, ["subHidden"]);
                expect(result).toMatchSnapshot();
            });

            it("displays help text for nested hidden route map", async (context) => {
                const result = await runWithInputs(app, ["subHidden", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("proposeCompletions", () => {
        describe("for route map at root", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
            testCompletions(
                app,
                ["baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["--help", ""], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["--version", ""], []);
            testCompletions(app, ["foo", "--help"], []);
            testCompletions(app, ["foo", "--help", ""], []);
        });

        describe("for route map at root including aliases", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "root route map" },
                aliases: {
                    doFoo: "foo",
                    b: "bar",
                    bz: "baz",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                completion: {
                    includeAliases: true,
                },
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                    { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                    { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );
            testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
            testCompletions(
                app,
                ["baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);
            testCompletions(app, ["fake", "b"], []);
            testCompletions(app, ["fake", "fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo", "--help"], []);
        });

        describe("for route map at root exclude aliases", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "root route map" },
                aliases: {
                    doFoo: "foo",
                    b: "bar",
                    bz: "baz",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                completion: {
                    includeAliases: false,
                },
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );
            testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
            testCompletions(
                app,
                ["baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);
            testCompletions(app, ["fake", "b"], []);
            testCompletions(app, ["fake", "fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo", "--help"], []);
        });

        describe("for route map at root including hidden routes", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: {
                    brief: "root route map",
                    hideRoute: {
                        baz: true,
                    },
                },
                aliases: {
                    doFoo: "foo",
                    b: "bar",
                    bz: "baz",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                completion: {
                    includeAliases: true,
                    includeHiddenRoutes: true,
                },
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                    { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                    { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["b", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );
            testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
            testCompletions(
                app,
                ["baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);
            testCompletions(app, ["fake", "b"], []);
            testCompletions(app, ["fake", "fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo", "--help"], []);
        });

        describe("for route map at root excluding hidden routes", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: {
                    brief: "root route map",
                    hideRoute: {
                        baz: true,
                    },
                },
                aliases: {
                    doFoo: "foo",
                    b: "bar",
                    bz: "baz",
                },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                completion: {
                    includeAliases: true,
                    includeHiddenRoutes: false,
                },
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["b", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );
            testCompletions(app, ["baz"], []);
            testCompletions(
                app,
                ["baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);
            testCompletions(app, ["fake", "b"], []);
            testCompletions(app, ["fake", "fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo", "--help"], []);
        });

        describe("for route map at root with camelCase route names", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    fooFlag: buildBasicRouteMap("fooFlag"),
                    barFlag: buildBasicRouteMap("barFlag"),
                    bazFlag: buildBasicRouteMap("bazFlag"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "fooFlag", brief: "fooFlag" },
                    { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                    { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                    { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
                ],
            );
            testCompletions(
                app,
                ["bazFlag"],
                [{ kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" }],
            );
            testCompletions(
                app,
                ["bazFlag", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["fooFlag", "--help"], []);
        });

        describe("for route map at root with camelCase route names, `allow-kebab-for-camel` parse case style", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    fooFlag: buildBasicRouteMap("fooFlag"),
                    barFlag: buildBasicRouteMap("barFlag"),
                    bazFlag: buildBasicRouteMap("bazFlag"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                scanner: { caseStyle: "allow-kebab-for-camel" },
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo-flag", brief: "fooFlag" },
                    { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                    { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                    { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
                ],
            );
            testCompletions(
                app,
                ["baz-flag"],
                [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" }],
            );
            testCompletions(
                app,
                ["baz-flag", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo-flag", "--help"], []);
        });

        describe("for route map at root with kebab-case route names, `original` parse case style", () => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    "foo-flag": buildBasicRouteMap("foo-flag"),
                    "bar-flag": buildBasicRouteMap("bar-flag"),
                    "baz-flag": buildBasicRouteMap("baz-flag"),
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // THEN
            testCompletions(app, [], []);

            testCompletions(
                app,
                [""],
                [
                    { kind: "routing-target:route-map", completion: "foo-flag", brief: "foo-flag" },
                    { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                    { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
                ],
            );
            testCompletions(
                app,
                ["b"],
                [
                    { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                    { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
                ],
            );
            testCompletions(
                app,
                ["baz-flag"],
                [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" }],
            );
            testCompletions(
                app,
                ["baz-flag", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["g"], []);
            testCompletions(app, ["fake"], []);
            testCompletions(app, ["fake", ""], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["foo-flag", "--help"], []);
        });

        describe("nested route map", () => {
            // GIVEN
            const nestedRouteMap = buildRouteMapForFakeContext({
                routes: {
                    foo: buildBasicRouteMap("foo"),
                    bar: buildBasicRouteMap("bar"),
                    baz: buildBasicRouteMap("baz"),
                },
                docs: { brief: "nested route map" },
            });
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    nested: nestedRouteMap,
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // THEN
            testCompletions(
                app,
                [""],
                [{ kind: "routing-target:route-map", completion: "nested", brief: "nested route map" }],
            );
            testCompletions(
                app,
                ["nested", ""],
                [
                    { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["nested", "b"],
                [
                    { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                    { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                ],
            );
            testCompletions(
                app,
                ["nested", "baz", ""],
                [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
            );

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["nested", "--help"], []);
            testCompletions(app, ["nested", "foo", "--help"], []);
        });

        describe("command at root without aliases", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                parse: numberParser,
                                brief: "number",
                                proposeCompletions: () => ["100", "150", "200"],
                            },
                        ],
                    },
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo",
                        },
                        bar: {
                            kind: "parsed",
                            parse: numberParser,
                            brief: "bar",
                        },
                    },
                },
                docs: { brief: "command brief" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication<CommandContext>(command, {
                name: "cli",
                versionInfo,
                completion: { includeAliases: true },
            });

            // THEN
            testCompletions(
                app,
                [""],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                    { kind: "argument:value", completion: "200", brief: "number" },
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["-"],
                [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["1"],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                ],
            );

            testCompletions(app, ["100", "100", "1"], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
        });

        describe("command at root with aliases", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                parse: numberParser,
                                brief: "number",
                                proposeCompletions: () => ["100", "150", "200"],
                            },
                        ],
                    },
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo",
                        },
                        bar: {
                            kind: "parsed",
                            parse: numberParser,
                            brief: "bar",
                        },
                    },
                    aliases: {
                        f: "foo",
                        b: "bar",
                    },
                },
                docs: { brief: "command brief" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication<CommandContext>(command, {
                name: "cli",
                versionInfo,
                completion: { includeAliases: true },
            });

            // THEN
            testCompletions(
                app,
                [""],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                    { kind: "argument:value", completion: "200", brief: "number" },
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "-f", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "-b", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["-"],
                [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "-f", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "-b", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["1"],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                ],
            );

            testCompletions(app, ["100", "100", "1"], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
        });

        describe("command at root with ignored aliases", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                parse: numberParser,
                                brief: "number",
                                proposeCompletions: () => ["100", "150", "200"],
                            },
                        ],
                    },
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo",
                        },
                        bar: {
                            kind: "parsed",
                            parse: numberParser,
                            brief: "bar",
                        },
                    },
                    aliases: {
                        f: "foo",
                        b: "bar",
                    },
                },
                docs: { brief: "command brief" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication<CommandContext>(command, {
                name: "cli",
                versionInfo,
                completion: { includeAliases: false },
            });

            // THEN
            testCompletions(
                app,
                [""],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                    { kind: "argument:value", completion: "200", brief: "number" },
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["-"],
                [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                ],
            );
            testCompletions(
                app,
                ["1"],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                ],
            );

            testCompletions(app, ["100", "100", "1"], []);

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
        });

        describe("nested command", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { readonly foo: boolean }, arg: number) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                parse: numberParser,
                                brief: "number",
                                proposeCompletions: () => ["100", "150", "200"],
                            },
                        ],
                    },
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo",
                        },
                    },
                    aliases: {
                        f: "foo",
                    },
                },
                docs: { brief: "command brief" },
            });
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: {
                    nested: command,
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };

            // WHEN
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // THEN
            testCompletions(
                app,
                ["nested"],
                [{ kind: "routing-target:command", completion: "nested", brief: "command brief" }],
            );
            testCompletions(
                app,
                ["nested", ""],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                    { kind: "argument:value", completion: "200", brief: "number" },
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                ],
            );
            testCompletions(app, ["nested", "-"], [{ kind: "argument:flag", completion: "--foo", brief: "foo" }]);
            testCompletions(
                app,
                ["nested", "1"],
                [
                    { kind: "argument:value", completion: "100", brief: "number" },
                    { kind: "argument:value", completion: "150", brief: "number" },
                ],
            );

            testCompletions(app, ["-h"], []);
            testCompletions(app, ["--help"], []);
            testCompletions(app, ["-v"], []);
            testCompletions(app, ["--version"], []);
            testCompletions(app, ["nested", "-h"], []);
            testCompletions(app, ["nested", "--help"], []);
        });
    });

    describe("generateHelpTextForAllCommands", () => {
        it("route map at root", async (context) => {
            // GIVEN
            const routeMap = buildBasicRouteMap("root");
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(routeMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("nested route map", async (context) => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub: buildBasicRouteMap("sub") },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("nested route map skips hidden routes", async (context) => {
            // GIVEN
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub: buildBasicRouteMap("sub") },
                docs: { brief: "root route map", hideRoute: { sub: true } },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("nested command, with aliases", async (context) => {
            // GIVEN
            const command = buildBasicCommand();
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub: command },
                aliases: {
                    alias1: "sub",
                    alias2: "sub",
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("nested commands", async (context) => {
            // GIVEN
            const command = buildBasicCommand();
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub1: command, sub2: command },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("nested commands, with aliases", async (context) => {
            // GIVEN
            const command = buildBasicCommand();
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub1: command, sub2: command },
                aliases: {
                    alias1: "sub1",
                    alias2: "sub2",
                },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("multiple commands at different levels", async (context) => {
            // GIVEN
            const command = buildBasicCommand();
            const subRouteMap = buildRouteMapForFakeContext({
                routes: { command: command },
                docs: { brief: "sub route map" },
            });
            const rootRouteMap = buildRouteMapForFakeContext({
                routes: { sub: subRouteMap, command: command },
                docs: { brief: "root route map" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("command at root", async (context) => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: Record<string, never>) => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "command brief" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication<CommandContext>(command, {
                name: "cli",
                versionInfo,
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("command at root, with usage config", async (context) => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: Record<string, never>) => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "command brief" },
            });
            const versionInfo: VersionInfo = {
                currentVersion: "1.0.0",
            };
            const app = buildApplication(command, {
                name: "cli",
                versionInfo,

                documentation: {
                    useAliasInUsageLine: true,
                },
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app);

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });

        it("fails with missing locale", async (context) => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: Record<string, never>) => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "command brief" },
            });
            const app = buildApplication(command, {
                name: "cli",
                documentation: {
                    useAliasInUsageLine: true,
                },
            });

            // WHEN
            expect(() => {
                generateHelpTextForAllCommands(app, "fake");
            }).to.throw(`Application does not support "fake" locale`);
        });

        it("command at root, with alternate locale", async (context) => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: Record<string, never>) => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "command brief" },
            });
            const fakeText = buildFakeApplicationText();
            const app = buildApplication(command, {
                name: "cli",
                localization: {
                    loadText: (locale) => {
                        return { en: text_en, fake: fakeText }[locale];
                    },
                },
                documentation: {
                    useAliasInUsageLine: true,
                },
            });

            // WHEN
            const documentedCommands = generateHelpTextForAllCommands(app, "fake");

            // THEN
            expect(documentedCommands).toMatchSnapshot();
        });
    });
});
