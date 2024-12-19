// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
import {
    ExitCode,
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
    type DocumentedCommand,
    type InputCompletion,
    type RouteMapBuilderArguments,
    type VersionInfo,
} from "../src";
// eslint-disable-next-line no-restricted-imports
import type { RouteMapRoutes } from "../src/routing/route-map/builder";
import { compareToBaseline, sanitizeStackTraceReferences, type BaselineFormat } from "./baseline";
import { buildFakeApplicationText } from "./fakes/config";
import { buildFakeContext, type FakeContext } from "./fakes/context";

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

interface ApplicationRunResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | string | undefined;
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

function serializeExitCode(exitCode: number | string | undefined): string {
    const knownExitCode = Object.entries(ExitCode).find(([_, value]) => value === exitCode);
    if (knownExitCode) {
        return knownExitCode[0];
    }
    if (typeof exitCode === "number") {
        return `Unknown(${exitCode})`;
    }
    return "<<No exit code specified>>";
}

function parseExitCode(exitCodeText: string | undefined): number | undefined {
    if (!exitCodeText) {
        return;
    }
    const knownExitCode = Object.entries(ExitCode).find(([name]) => name === exitCodeText);
    if (knownExitCode) {
        return knownExitCode[1];
    }
    if (exitCodeText.startsWith("Unknown")) {
        return Number(exitCodeText.substring(8, exitCodeText.length - 1));
    }
}

const ApplicationRunResultBaselineFormat: BaselineFormat<ApplicationRunResult> = {
    *serialize(result) {
        yield `ExitCode=${serializeExitCode(result.exitCode)}`;
        yield ":: STDOUT";
        yield result.stdout;
        yield ":: STDERR";
        yield sanitizeStackTraceReferences(result.stderr);
    },
    parse(lines) {
        const exitCodeText = lines[0]!.split("=")[1];
        const exitCode = parseExitCode(exitCodeText);
        const stdoutStart = lines.indexOf(":: STDOUT");
        const stderrStart = lines.indexOf(":: STDERR");
        return {
            exitCode,
            stdout: lines.slice(stdoutStart + 1, stderrStart).join("\n"),
            stderr: lines.slice(stderrStart + 1).join("\n"),
        };
    },
    compare(actual, expected) {
        expect(actual.exitCode).to.deep.equal(expected.exitCode, "Application exited with unexpected exit code");
        expect(actual.stdout).to.deep.equal(expected.stdout, "Content of stdout did not match baseline");
        expect(actual.stderr).to.deep.equal(expected.stderr, "Content of stderr did not match baseline");
    },
};

const DocumentedCommandsBaselineFormat: BaselineFormat<readonly DocumentedCommand[]> = {
    *serialize(routes) {
        for (const route of routes) {
            yield `:: ${route[0]}`;
            yield* route[1].split("\n");
        }
    },
    parse(lines) {
        const routes: DocumentedCommand[] = [];
        let currentRoute: string | undefined;
        let routeLines: string[] = [];
        for (const line of lines) {
            if (line.startsWith(":: ")) {
                if (currentRoute) {
                    routes.push([currentRoute, routeLines.join("\n")]);
                    routeLines = [];
                }
                currentRoute = line.slice(3);
            } else {
                routeLines.push(line);
            }
        }
        if (currentRoute) {
            routes.push([currentRoute, routeLines.join("\n")]);
        }
        return routes;
    },
    compare(actual, expected) {
        const actualRoutes = actual.map(([route]) => route);
        const expectedRoutes = expected.map(([route]) => route);
        expect(actualRoutes).to.deep.equal(expectedRoutes, "Set of documented command routes differs");
        const expectedTextForRoutes = new Map(expected);
        for (const [route, actualText] of actual) {
            const expectedText = expectedTextForRoutes.get(route);
            expect(actualText).to.deep.equal(expectedText, `Help text for route "${route}" did not match baseline`);
        }
    },
};

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
            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root, no color depth", async function () {
                const result = await runWithInputs(app, ["--help"], { colorDepth: void 0 });
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root, color depth < 4", async function () {
                const result = await runWithInputs(app, ["--help"], { colorDepth: 2 });
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root, color depth > 4", async function () {
                const result = await runWithInputs(app, ["--help"], { colorDepth: 8 });
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root (with flag alias)", async function () {
                const result = await runWithInputs(app, ["-h"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("request current version", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version (with flag alias)", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("request current version", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version (with flag alias)", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("request current version", async function () {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("display help text for root", async function () {
                    const result = await runWithInputs(app, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version", async function () {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("display help text for root, warn on outdated version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for root, warn on outdated version, with no ansi color", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], { colorDepth: void 0 });
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for root, warn on outdated version, no ansi color with env var", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                        colorDepth: void 0,
                        env: {
                            STRICLI_NO_COLOR: "",
                        },
                    });
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for root, warn on outdated version, ansi color with env var set to 0", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"], {
                        colorDepth: void 0,
                        env: {
                            STRICLI_NO_COLOR: "0",
                        },
                    });
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("display help text for root, warn on outdated version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

                it("display help text for root", async function () {
                    const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

                it("display help text for root", async function () {
                    const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root (with flag alias)", async function () {
                const result = await runWithInputs(app, ["-h"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("request current version", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version (with flag alias)", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("request current version", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version (with flag alias)", async function () {
                    const result = await runWithInputs(appWithCurrentVersion, ["-v"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("display help text for root, no warning", async function () {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version", async function () {
                    const result = await runWithInputs(appWithUpToDateVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                it("display help text for root, warn on outdated version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for subcommand, warn on outdated version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["command", "--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("request current version", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for root, skip check with env var defined", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                        env: {
                            STRICLI_SKIP_VERSION_CHECK: "",
                        },
                    });
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });

                it("display help text for root, do not skip check with env var set to 0", async function () {
                    const result = await runWithInputs(appWithOutdatedVersion, ["--version"], {
                        env: {
                            STRICLI_SKIP_VERSION_CHECK: "0",
                        },
                    });
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
                    it("display help text for root, warn on outdated version", async function () {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--help"]);
                        compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                    });

                    it("display help text for subcommand, warn on outdated version", async function () {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, [
                            "command",
                            "--help",
                        ]);
                        compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                    });

                    it("request current version", async function () {
                        const result = await runWithInputs(appWithOutdatedVersionAndUpgradeCommand, ["--version"]);
                        compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                    });
                });
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route, with no ansi color", async function () {
                const result = await runWithInputs(app, ["undefined"], { colorDepth: void 0 });
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route, proposes similar alternative", async function () {
                const result = await runWithInputs(app, ["commandx"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

                it("fails for undefined route, proposes similar alternative", async function () {
                    const result = await runWithInputs(appWithCustomDistanceThreshold, ["commandxyz"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });
            });

            describe("with allow-kebab-for-camel", () => {
                const appWithCustomDistanceThreshold = buildApplication(routeMap, {
                    name: "cli",
                    scanner: {
                        caseStyle: "allow-kebab-for-camel",
                    },
                });

                it("fails for undefined route, proposes similar alternative", async function () {
                    const result = await runWithInputs(appWithCustomDistanceThreshold, ["commandxyz"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
                });
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("runs subcommand directly with no arguments", async function () {
                const result = await runWithInputs(app, ["command"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for subcommand", async function () {
                const result = await runWithInputs(app, ["command", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for subcommand (with flag alias)", async function () {
                const result = await runWithInputs(app, ["command", "-h"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

                it("display help text for root", async function () {
                    const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("runs default command (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root (with flag alias)", async function () {
                const result = await runWithInputs(app, ["-h"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("passes undefined route as argument to default command", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("passes similar route as argument to default command", async function () {
                const result = await runWithInputs(app, ["commandx"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("passes undefined flag to default command", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("runs subcommand directly with no arguments", async function () {
                const result = await runWithInputs(app, ["default"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for default command", async function () {
                const result = await runWithInputs(app, ["default", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for default command (with flag alias)", async function () {
                const result = await runWithInputs(app, ["default", "-h"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("runs subcommand directly with default route name as argument", async function () {
                const result = await runWithInputs(app, ["default", "default"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("runs subcommand directly with alternate route name as argument", async function () {
                const result = await runWithInputs(app, ["default", "alternate"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

                it("display help text for root", async function () {
                    const result = await runWithInputs(appWithAlternateUsage, ["--help"]);
                    compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map (implicit)", async function () {
                const result = await runWithInputs(app, ["sub"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map", async function () {
                const result = await runWithInputs(app, ["sub", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for alias-adjacent route", async function () {
                const result = await runWithInputs(app, ["aliasX"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map with route alias", async function () {
                const result = await runWithInputs(app, ["sub"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias (implicit)", async function () {
                const result = await runWithInputs(app, ["alias"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias", async function () {
                const result = await runWithInputs(app, ["alias", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for alias-adjacent route", async function () {
                const result = await runWithInputs(app, ["aliasX"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map with route alias", async function () {
                const result = await runWithInputs(app, ["sub"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias (implicit)", async function () {
                const result = await runWithInputs(app, ["aliasFoo"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias", async function () {
                const result = await runWithInputs(app, ["aliasFoo", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias kebab-case version (implicit)", async function () {
                const result = await runWithInputs(app, ["alias-foo"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested route map via route alias kebab-case version", async function () {
                const result = await runWithInputs(app, ["alias-foo", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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

        it("runs command with original context", async function () {
            // GIVEN
            const command = buildBasicCommand();
            const app = buildApplication(command, {
                name: "cli",
            });

            // WHEN
            const result = await runWithInputs(app, [], { forCommand: false });

            // THEN
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("fails when context.forCommand throws error", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("fails when context.forCommand throws error, with no ansi color", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("fails when context.forCommand throws error (without stack)", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("fails when context.forCommand throws non-error", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("loads text for context locale", async function () {
            // GIVEN
            const command = buildBasicCommand();
            const app = buildApplication(command, {
                name: "cli",
            });

            // WHEN
            const result = await runWithInputs(app, [], { locale: "en" });

            // THEN
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("uses default text when no text loaded for unsupported context locale", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
        });

        it("uses default text when no text loaded for unsupported context locale, with no ansi color", async function () {
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
            compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root including hidden", async function () {
                const result = await runWithInputs(app, ["--help-all"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map (implicit)", async function () {
                const result = await runWithInputs(app, ["subHidden"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map", async function () {
                const result = await runWithInputs(app, ["subHidden", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root including hidden", async function () {
                const result = await runWithInputs(app, ["--help-all"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map (implicit)", async function () {
                const result = await runWithInputs(app, ["subHidden"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map", async function () {
                const result = await runWithInputs(app, ["subHidden", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
            it("display help text for root (implicit)", async function () {
                const result = await runWithInputs(app, []);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root", async function () {
                const result = await runWithInputs(app, ["--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("display help text for root including hidden", async function () {
                const result = await runWithInputs(app, ["--help-all"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined route", async function () {
                const result = await runWithInputs(app, ["undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("fails for undefined flag", async function () {
                const result = await runWithInputs(app, ["--undefined"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map (implicit)", async function () {
                const result = await runWithInputs(app, ["subHidden"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
            });

            it("displays help text for nested hidden route map", async function () {
                const result = await runWithInputs(app, ["subHidden", "--help"]);
                compareToBaseline(this, ApplicationRunResultBaselineFormat, result);
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
        it("route map at root", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("nested route map", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("nested route map skips hidden routes", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("nested command, with aliases", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("nested commands", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("nested commands, with aliases", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("multiple commands at different levels", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("command at root", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("command at root, with usage config", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });

        it("fails with missing locale", async function () {
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

        it("command at root, with alternate locale", async function () {
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
            compareToBaseline(this, DocumentedCommandsBaselineFormat, documentedCommands);
        });
    });
});
