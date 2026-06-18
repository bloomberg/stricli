// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import { buildCommand, buildRouteMap, type CommandContext, type ScannerConfiguration } from "../../src";
// eslint-disable-next-line no-restricted-imports
import { buildRouteScanner, type RouteNotFoundError, type RouteScanResult } from "../../src/routing/scanner";

function confirmRouteScanResult(
    args: Parameters<typeof buildRouteScanner<CommandContext>>,
    inputs: readonly string[],
    expected: RouteScanResult<CommandContext>,
): void {
    const scanner = buildRouteScanner(...args);
    for (const input of inputs) {
        scanner.next(input);
    }
    const result = scanner.finish();
    expect(result).to.deep.equal(expected);
}

function confirmRouteScanError(
    args: Parameters<typeof buildRouteScanner<CommandContext>>,
    inputs: readonly string[],
    expected: RouteNotFoundError<CommandContext>,
): void {
    const scanner = buildRouteScanner(...args);
    let error: RouteNotFoundError<CommandContext> | undefined;
    for (const input of inputs) {
        if (error) {
            expect.fail(`Error encountered before end of inputs, did not scan "${input}"`);
        }
        error = scanner.next(input);
    }
    expect(error).to.deep.equal(expected);
}

describe("RouteScanner", () => {
    const defaultScannerConfig: ScannerConfiguration = {
        caseStyle: "original",
        allowArgumentEscapeSequence: false,
        distanceOptions: {
            threshold: 7,
            weights: {
                insertion: 1,
                deletion: 3,
                substitution: 2,
                transposition: 0,
            },
        },
    };

    describe("command at root", () => {
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: {}, ...args: string[]) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "array",
                    parameter: {
                        brief: "",
                        parse: String,
                    },
                },
                flags: {},
            },
            docs: { brief: "top command brief" },
        });

        describe("scans root as target", () => {
            const commonExpectedResult = {
                target: command,
                prefix: ["cli"],
                rootLevel: true,
                aliases: { original: [], "convert-camel-to-kebab": [] },
            } satisfies Partial<RouteScanResult<CommandContext>>;

            it("with no inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], [], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: [],
                });
            });

            it("with help flag", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--help"], {
                    ...commonExpectedResult,
                    helpRequested: true,
                    unprocessedInputs: [],
                });
            });

            it("with help flag (alias)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["-h"], {
                    ...commonExpectedResult,
                    helpRequested: true,
                    unprocessedInputs: [],
                });
            });

            it("with help flag (extraneous help flags provided)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--help", "--help"], {
                    ...commonExpectedResult,
                    helpRequested: true,
                    unprocessedInputs: [],
                });
            });

            it("with helpAll flag", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--helpAll"], {
                    ...commonExpectedResult,
                    helpRequested: "all",
                    unprocessedInputs: [],
                });
            });

            it("with helpAll flag (alias)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["-H"], {
                    ...commonExpectedResult,
                    helpRequested: "all",
                    unprocessedInputs: [],
                });
            });

            it("with helpAll flag (both help and helpAll provided)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--help", "--helpAll"], {
                    ...commonExpectedResult,
                    helpRequested: "all",
                    unprocessedInputs: [],
                });
            });

            it("with unprocessed inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["foo", "bar", "baz"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["foo", "bar", "baz"],
                });
            });

            it("with unprocessed inputs containing other flags", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--foo", "--bar", "--baz"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["--foo", "--bar", "--baz"],
                });
            });

            it("with unprocessed inputs containing other flags (aliases)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["-f", "-b", "-B"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["-f", "-b", "-B"],
                });
            });

            it("with unprocessed inputs containing other flags (combined aliases)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["-fbB"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["-fbB"],
                });
            });

            it("with unprocessed inputs containing other flags and values", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--foo", "1", "--bar", "2"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["--foo", "1", "--bar", "2"],
                });
            });

            it("with unprocessed inputs containing other flags with values", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--foo=1", "--bar=2"], {
                    ...commonExpectedResult,
                    helpRequested: false,
                    unprocessedInputs: ["--foo=1", "--bar=2"],
                });
            });

            it("with unprocessed inputs containing help flag after argument escape sequence", () => {
                confirmRouteScanResult(
                    [
                        command,
                        {
                            ...defaultScannerConfig,
                            allowArgumentEscapeSequence: true,
                        },
                        ["cli"],
                    ],
                    ["--", "--help"],
                    {
                        ...commonExpectedResult,
                        helpRequested: false,
                        unprocessedInputs: ["--", "--help"],
                    },
                );
            });

            it("with unprocessed inputs containing helpAll flag after argument escape sequence", () => {
                confirmRouteScanResult(
                    [
                        command,
                        {
                            ...defaultScannerConfig,
                            allowArgumentEscapeSequence: true,
                        },
                        ["cli"],
                    ],
                    ["--", "--helpAll"],
                    {
                        ...commonExpectedResult,
                        helpRequested: false,
                        unprocessedInputs: ["--", "--helpAll"],
                    },
                );
            });

            it("with unprocessed inputs containing help flag before argument escape sequence", () => {
                confirmRouteScanResult(
                    [
                        command,
                        {
                            ...defaultScannerConfig,
                            allowArgumentEscapeSequence: true,
                        },
                        ["cli"],
                    ],
                    ["--help", "--"],
                    {
                        ...commonExpectedResult,
                        helpRequested: true,
                        unprocessedInputs: ["--"],
                    },
                );
            });

            it("with help flag and trailing unprocessed inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["--help", "foo", "bar", "baz"], {
                    ...commonExpectedResult,
                    helpRequested: true,
                    unprocessedInputs: ["foo", "bar", "baz"],
                });
            });

            it("with help flag in between unprocessed inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"]], ["foo", "--help", "bar", "baz"], {
                    ...commonExpectedResult,
                    helpRequested: true,
                    unprocessedInputs: ["foo", "bar", "baz"],
                });
            });
        });
    });

    describe("route map at root", () => {
        const subCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "sub command brief" },
        });
        const subRouteMap = buildRouteMap({
            routes: { doNothing1: subCommand, "do-nothing2": subCommand },
            docs: { brief: "sub route map brief" },
        });
        const topCommand = buildCommand({
            loader: async () => {
                return {
                    default: (flags: {}, ...args: string[]) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "array",
                    parameter: {
                        brief: "",
                        parse: String,
                    },
                },
                flags: {},
            },
            docs: { brief: "top command brief" },
        });
        const routeMap = buildRouteMap({
            routes: {
                command: topCommand,
                camelCase: subRouteMap,
                "kebab-case": subRouteMap,
            },
            docs: {
                brief: "route map brief",
            },
        });

        describe("with 'original' case style", () => {
            describe("scans root as target", () => {
                it("with no inputs", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], [], {
                        helpRequested: false,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["--help"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag (alias)", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["-h"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag, leave post-help inputs unprocessed", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["--help", "command"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: ["command"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });
            });

            describe("scans nested command as target", () => {
                it("with simple name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["command"], {
                        helpRequested: false,
                        target: topCommand,
                        prefix: ["cli", "command"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with simple name and help flag", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["command", "--help"], {
                        helpRequested: true,
                        target: topCommand,
                        prefix: ["cli", "command"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with simple name and unprocessed inputs", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"]],
                        ["command", "foo", "bar", "baz"],
                        {
                            helpRequested: false,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            rootLevel: false,
                            unprocessedInputs: ["foo", "bar", "baz"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["camelCase"], {
                        helpRequested: false,
                        target: subRouteMap,
                        prefix: ["cli", "camelCase"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with camelCase name and help flag", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "--help"], {
                        helpRequested: true,
                        target: subRouteMap,
                        prefix: ["cli", "camelCase"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with multiple camelCase names", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "doNothing1"], {
                        helpRequested: false,
                        target: subCommand,
                        prefix: ["cli", "camelCase", "doNothing1"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "do-nothing2"], {
                        helpRequested: false,
                        target: subCommand,
                        prefix: ["cli", "camelCase", "do-nothing2"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with kebab-case name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case"], {
                        helpRequested: false,
                        target: subRouteMap,
                        prefix: ["cli", "kebab-case"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with kebab-case name and help flag", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "--help"], {
                        helpRequested: true,
                        target: subRouteMap,
                        prefix: ["cli", "kebab-case"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "doNothing1"], {
                        helpRequested: false,
                        target: subCommand,
                        prefix: ["cli", "kebab-case", "doNothing1"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with multiple kebab-case names", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "do-nothing2"], {
                        helpRequested: false,
                        target: subCommand,
                        prefix: ["cli", "kebab-case", "do-nothing2"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });
            });

            it("fails to scan when input does not match routes", () => {
                confirmRouteScanError([routeMap, defaultScannerConfig, ["cli"]], ["does-not-exist"], {
                    input: "does-not-exist",
                    routeMap: routeMap,
                });
            });
        });

        describe("with allow-kebab-for-camel case style", () => {
            const configWithAllowKebabForCamel = {
                ...defaultScannerConfig,
                caseStyle: "allow-kebab-for-camel",
            } satisfies ScannerConfiguration;

            describe("scans root as target", () => {
                it("with no inputs", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], [], {
                        helpRequested: false,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["--help"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag (alias)", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["-h"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with helpAll flag (as kebab-case)", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["--help-all"], {
                        helpRequested: "all",
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag, leave post-help inputs unprocessed", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["--help", "command"], {
                        helpRequested: true,
                        target: routeMap,
                        prefix: ["cli"],
                        rootLevel: true,
                        unprocessedInputs: ["command"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });
            });

            describe("scans nested command as target", () => {
                it("with simple name", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["command"], {
                        helpRequested: false,
                        target: topCommand,
                        prefix: ["cli", "command"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with simple name and help flag", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["command", "--help"], {
                        helpRequested: true,
                        target: topCommand,
                        prefix: ["cli", "command"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with simple name and unprocessed inputs", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["command", "foo", "bar", "baz"],
                        {
                            helpRequested: false,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            rootLevel: false,
                            unprocessedInputs: ["foo", "bar", "baz"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["camelCase"], {
                        helpRequested: false,
                        target: subRouteMap,
                        prefix: ["cli", "camelCase"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with camelCase name (as kebab-case)", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["camel-case"], {
                        helpRequested: false,
                        target: subRouteMap,
                        prefix: ["cli", "camel-case"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with camelCase name and help flag", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["camelCase", "--help"], {
                        helpRequested: true,
                        target: subRouteMap,
                        prefix: ["cli", "camelCase"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with camelCase name (as kebab-case) and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["camel-case", "--help"],
                        {
                            helpRequested: true,
                            target: subRouteMap,
                            prefix: ["cli", "camel-case"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple camelCase names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["camelCase", "doNothing1"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "doNothing1"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple camelCase names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["camel-case", "do-nothing1"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "camel-case", "do-nothing1"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["camelCase", "do-nothing2"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "do-nothing2"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["camel-case", "do-nothing2"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "camel-case", "do-nothing2"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with kebab-case name", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["kebab-case"], {
                        helpRequested: false,
                        target: subRouteMap,
                        prefix: ["cli", "kebab-case"],
                        rootLevel: false,
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with kebab-case name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["kebab-case", "--help"],
                        {
                            helpRequested: true,
                            target: subRouteMap,
                            prefix: ["cli", "kebab-case"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["kebab-case", "doNothing1"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "doNothing1"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["kebab-case", "do-nothing1"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "do-nothing1"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple kebab-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"]],
                        ["kebab-case", "do-nothing2"],
                        {
                            helpRequested: false,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "do-nothing2"],
                            rootLevel: false,
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });
            });

            it("fails to scan when input does not match routes", () => {
                confirmRouteScanError([routeMap, configWithAllowKebabForCamel, ["cli"]], ["does-not-exist"], {
                    input: "does-not-exist",
                    routeMap: routeMap,
                });
            });
        });
    });

    describe("route map at root with route collision", () => {
        const camelCaseCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "sub command brief" },
        });
        const kebabCaseCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "sub command brief" },
        });
        const routeMap = buildRouteMap({
            routes: {
                routeName: camelCaseCommand,
                "route-name": kebabCaseCommand,
            },
            docs: {
                brief: "route map brief",
            },
        });

        describe("with 'original' case style", () => {
            it("scans camelCase route with exact name", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["routeName"], {
                    helpRequested: false,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and help text", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["routeName", "--help"], {
                    helpRequested: true,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["routeName", "foo", "bar", "baz"], {
                    helpRequested: false,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    rootLevel: false,
                    unprocessedInputs: ["foo", "bar", "baz"],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["route-name"], {
                    helpRequested: false,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name and help flag", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["route-name", "--help"], {
                    helpRequested: true,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["route-name", "foo", "bar", "baz"], {
                    helpRequested: false,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    rootLevel: false,
                    unprocessedInputs: ["foo", "bar", "baz"],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });
        });

        describe("with 'allow-kebab-for-camel' case style", () => {
            const configWithAllowKebabForCamel = {
                ...defaultScannerConfig,
                caseStyle: "allow-kebab-for-camel",
            } satisfies ScannerConfiguration;

            it("scans camelCase route with exact name", () => {
                confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["routeName"], {
                    helpRequested: false,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and help flag", () => {
                confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["routeName", "--help"], {
                    helpRequested: true,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"]],
                    ["routeName", "foo", "bar", "baz"],
                    {
                        helpRequested: false,
                        target: camelCaseCommand,
                        prefix: ["cli", "routeName"],
                        rootLevel: false,
                        unprocessedInputs: ["foo", "bar", "baz"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name", () => {
                confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["route-name"], {
                    helpRequested: false,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name and help flag", () => {
                confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"]], ["route-name", "--help"], {
                    helpRequested: true,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    rootLevel: false,
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"]],
                    ["route-name", "foo", "bar", "baz"],
                    {
                        helpRequested: false,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
                        rootLevel: false,
                        unprocessedInputs: ["foo", "bar", "baz"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });
        });
    });

    describe("route map with default command", () => {
        const defaultCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "default command brief" },
        });
        const alternateCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "alternate command brief" },
        });
        const routeMap = buildRouteMap({
            routes: {
                default: defaultCommand,
                alternate: alternateCommand,
            },
            defaultCommand: "default",
            docs: {
                brief: "route map brief",
            },
        });

        it("scans default command as target with no inputs", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], [], {
                helpRequested: false,
                target: defaultCommand,
                prefix: ["cli"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans root as target with help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["--help"], {
                helpRequested: true,
                target: routeMap,
                prefix: ["cli"],
                rootLevel: true,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
        it("scans default command as target with unprocessed inputs (value)", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["arg"], {
                helpRequested: false,
                target: defaultCommand,
                prefix: ["cli"],
                rootLevel: false,
                unprocessedInputs: ["arg"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans default command as target with unprocessed inputs (flag)", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["--flag"], {
                helpRequested: false,
                target: defaultCommand,
                prefix: ["cli"],
                rootLevel: false,
                unprocessedInputs: ["--flag"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans default command as target with explicit default route", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["default"], {
                helpRequested: false,
                target: defaultCommand,
                prefix: ["cli", "default"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [""], "convert-camel-to-kebab": [""] },
            });
        });
        it("scans default command as target with explicit default route with help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["default", "--help"], {
                helpRequested: true,
                target: defaultCommand,
                prefix: ["cli", "default"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [""], "convert-camel-to-kebab": [""] },
            });
        });
        it("scans default command as target with input that is adjacent to the default rotue", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["defaultx"], {
                helpRequested: false,
                target: defaultCommand,
                prefix: ["cli"],
                rootLevel: false,
                unprocessedInputs: ["defaultx"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans non-default command as target with exact route", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["alternate"], {
                helpRequested: false,
                target: alternateCommand,
                prefix: ["cli", "alternate"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
        it("scans non-default command as target with exact route and help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"]], ["alternate", "--help"], {
                helpRequested: true,
                target: alternateCommand,
                prefix: ["cli", "alternate"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
    });
});
