// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import { buildCommand, buildRouteMap, text_en, type CommandContext, type ScannerConfiguration } from "../../src";
// eslint-disable-next-line no-restricted-imports
import {
    buildRouteScanner,
    type RouteScanner,
    type AdditionalFlag,
    type RouteNotFoundError,
    type RouteScanResult,
} from "../../src/routing/scanner";

function confirmRouteScanResult(
    args: Parameters<typeof buildRouteScanner<AdditionalFlag, CommandContext>>,
    inputs: readonly string[],
    expected: ReturnType<RouteScanner<AdditionalFlag, CommandContext>["finish"]>,
): void {
    const scanner = buildRouteScanner(...args);
    for (const input of inputs) {
        scanner.next(input);
    }
    const result = scanner.finish();
    expect(result).to.deep.equal(expected);
}

function confirmRouteScanError(
    args: Parameters<typeof buildRouteScanner<AdditionalFlag, CommandContext>>,
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

    const helpFlag: AdditionalFlag = {
        name: "help",
        aliases: ["h"],
        brief: text_en.briefs.help,
        global: true,
    };
    const helpAllFlag: AdditionalFlag = {
        name: "helpAll",
        aliases: ["H"],
        brief: text_en.briefs.helpAll,
        global: true,
        hidden: true,
    };
    const defaultFlags: readonly AdditionalFlag[] = [helpFlag, helpAllFlag];

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
                aliases: { original: [], "convert-camel-to-kebab": [] },
            } satisfies Partial<RouteScanResult<CommandContext>>;

            it("with no inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], [], {
                    ...commonExpectedResult,
                    activeFlag: undefined,
                    unprocessedInputs: [],
                });
            });

            it("with help flag", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["--help"], {
                    ...commonExpectedResult,
                    activeFlag: helpFlag,
                    unprocessedInputs: [],
                });
            });

            it("with help flag (alias)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["-h"], {
                    ...commonExpectedResult,
                    activeFlag: helpFlag,
                    unprocessedInputs: [],
                });
            });

            it("with help flag (extraneous help flags provided)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["--help", "--help"], {
                    ...commonExpectedResult,
                    activeFlag: helpFlag,
                    unprocessedInputs: ["--help"],
                });
            });

            it("with helpAll flag", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["--helpAll"], {
                    ...commonExpectedResult,
                    activeFlag: helpAllFlag,
                    unprocessedInputs: [],
                });
            });

            it("with helpAll flag (alias)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["-H"], {
                    ...commonExpectedResult,
                    activeFlag: helpAllFlag,
                    unprocessedInputs: [],
                });
            });

            it("with helpAll flag (both help and helpAll provided)", () => {
                confirmRouteScanResult(
                    [command, defaultScannerConfig, ["cli"], defaultFlags],
                    ["--help", "--helpAll"],
                    {
                        ...commonExpectedResult,
                        activeFlag: helpFlag,
                        unprocessedInputs: ["--helpAll"],
                    },
                );
            });

            it("with unprocessed inputs", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["foo", "bar", "baz"], {
                    ...commonExpectedResult,
                    activeFlag: undefined,
                    unprocessedInputs: ["foo", "bar", "baz"],
                });
            });

            it("with unprocessed inputs containing other flags", () => {
                confirmRouteScanResult(
                    [command, defaultScannerConfig, ["cli"], defaultFlags],
                    ["--foo", "--bar", "--baz"],
                    {
                        ...commonExpectedResult,
                        activeFlag: undefined,
                        unprocessedInputs: ["--foo", "--bar", "--baz"],
                    },
                );
            });

            it("with unprocessed inputs containing other flags (aliases)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["-f", "-b", "-B"], {
                    ...commonExpectedResult,
                    activeFlag: undefined,
                    unprocessedInputs: ["-f", "-b", "-B"],
                });
            });

            it("with unprocessed inputs containing other flags (combined aliases)", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["-fbB"], {
                    ...commonExpectedResult,
                    activeFlag: undefined,
                    unprocessedInputs: ["-fbB"],
                });
            });

            it("with unprocessed inputs containing other flags and values", () => {
                confirmRouteScanResult(
                    [command, defaultScannerConfig, ["cli"], defaultFlags],
                    ["--foo", "1", "--bar", "2"],
                    {
                        ...commonExpectedResult,
                        activeFlag: undefined,
                        unprocessedInputs: ["--foo", "1", "--bar", "2"],
                    },
                );
            });

            it("with unprocessed inputs containing other flags with values", () => {
                confirmRouteScanResult([command, defaultScannerConfig, ["cli"], defaultFlags], ["--foo=1", "--bar=2"], {
                    ...commonExpectedResult,
                    activeFlag: undefined,
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
                        defaultFlags,
                    ],
                    ["--", "--help"],
                    {
                        ...commonExpectedResult,
                        activeFlag: undefined,
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
                        defaultFlags,
                    ],
                    ["--", "--helpAll"],
                    {
                        ...commonExpectedResult,
                        activeFlag: undefined,
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
                        defaultFlags,
                    ],
                    ["--help", "--"],
                    {
                        ...commonExpectedResult,
                        activeFlag: helpFlag,
                        unprocessedInputs: ["--"],
                    },
                );
            });

            it("with help flag and trailing unprocessed inputs", () => {
                confirmRouteScanResult(
                    [command, defaultScannerConfig, ["cli"], defaultFlags],
                    ["--help", "foo", "bar", "baz"],
                    {
                        ...commonExpectedResult,
                        activeFlag: helpFlag,
                        unprocessedInputs: ["foo", "bar", "baz"],
                    },
                );
            });

            it("with help flag in between unprocessed inputs", () => {
                confirmRouteScanResult(
                    [command, defaultScannerConfig, ["cli"], defaultFlags],
                    ["foo", "--help", "bar", "baz"],
                    {
                        ...commonExpectedResult,
                        activeFlag: helpFlag,
                        unprocessedInputs: ["foo", "bar", "baz"],
                    },
                );
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
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], [], {
                        activeFlag: undefined,
                        target: routeMap,
                        prefix: ["cli"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["--help"], {
                        activeFlag: helpFlag,
                        target: routeMap,
                        prefix: ["cli"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag (alias)", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["-h"], {
                        activeFlag: helpFlag,
                        target: routeMap,
                        prefix: ["cli"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag, leave post-help inputs unprocessed", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["--help", "command"],
                        {
                            activeFlag: helpFlag,
                            target: routeMap,
                            prefix: ["cli"],
                            unprocessedInputs: ["command"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });
            });

            describe("scans nested command as target", () => {
                it("with simple name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["command"], {
                        activeFlag: undefined,
                        target: topCommand,
                        prefix: ["cli", "command"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with simple name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["command", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with simple name and unprocessed inputs", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["command", "foo", "bar", "baz"],
                        {
                            activeFlag: undefined,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            unprocessedInputs: ["foo", "bar", "baz"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["camelCase"], {
                        activeFlag: undefined,
                        target: subRouteMap,
                        prefix: ["cli", "camelCase"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with camelCase name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["camelCase", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: subRouteMap,
                            prefix: ["cli", "camelCase"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple camelCase names", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["camelCase", "doNothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "doNothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["camelCase", "do-nothing2"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "do-nothing2"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with kebab-case name", () => {
                    confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["kebab-case"], {
                        activeFlag: undefined,
                        target: subRouteMap,
                        prefix: ["cli", "kebab-case"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with kebab-case name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["kebab-case", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: subRouteMap,
                            prefix: ["cli", "kebab-case"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["kebab-case", "doNothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "doNothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple kebab-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                        ["kebab-case", "do-nothing2"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "do-nothing2"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });
            });

            it("fails to scan when input does not match routes", () => {
                confirmRouteScanError([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["does-not-exist"], {
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
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags], [], {
                        activeFlag: undefined,
                        target: routeMap,
                        prefix: ["cli"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["--help"],
                        {
                            activeFlag: helpFlag,
                            target: routeMap,
                            prefix: ["cli"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with help flag (alias)", () => {
                    confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags], ["-h"], {
                        activeFlag: helpFlag,
                        target: routeMap,
                        prefix: ["cli"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    });
                });

                it("with helpAll flag (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["--help-all"],
                        {
                            activeFlag: helpAllFlag,
                            target: routeMap,
                            prefix: ["cli"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with help flag, leave post-help inputs unprocessed", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["--help", "command"],
                        {
                            activeFlag: helpFlag,
                            target: routeMap,
                            prefix: ["cli"],
                            unprocessedInputs: ["command"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });
            });

            describe("scans nested command as target", () => {
                it("with simple name", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["command"],
                        {
                            activeFlag: undefined,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with simple name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["command", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with simple name and unprocessed inputs", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["command", "foo", "bar", "baz"],
                        {
                            activeFlag: undefined,
                            target: topCommand,
                            prefix: ["cli", "command"],
                            unprocessedInputs: ["foo", "bar", "baz"],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camelCase"],
                        {
                            activeFlag: undefined,
                            target: subRouteMap,
                            prefix: ["cli", "camelCase"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camel-case"],
                        {
                            activeFlag: undefined,
                            target: subRouteMap,
                            prefix: ["cli", "camel-case"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camelCase", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: subRouteMap,
                            prefix: ["cli", "camelCase"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with camelCase name (as kebab-case) and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camel-case", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: subRouteMap,
                            prefix: ["cli", "camel-case"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple camelCase names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camelCase", "doNothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "doNothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple camelCase names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camel-case", "do-nothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camel-case", "do-nothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camelCase", "do-nothing2"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camelCase", "do-nothing2"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["camel-case", "do-nothing2"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "camel-case", "do-nothing2"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with kebab-case name", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["kebab-case"],
                        {
                            activeFlag: undefined,
                            target: subRouteMap,
                            prefix: ["cli", "kebab-case"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with kebab-case name and help flag", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["kebab-case", "--help"],
                        {
                            activeFlag: helpFlag,
                            target: subRouteMap,
                            prefix: ["cli", "kebab-case"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["kebab-case", "doNothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "doNothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple mixed-case names (as kebab-case)", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["kebab-case", "do-nothing1"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "do-nothing1"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });

                it("with multiple kebab-case names", () => {
                    confirmRouteScanResult(
                        [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                        ["kebab-case", "do-nothing2"],
                        {
                            activeFlag: undefined,
                            target: subCommand,
                            prefix: ["cli", "kebab-case", "do-nothing2"],
                            unprocessedInputs: [],
                            aliases: { original: [], "convert-camel-to-kebab": [] },
                        },
                    );
                });
            });

            it("fails to scan when input does not match routes", () => {
                confirmRouteScanError(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["does-not-exist"],
                    {
                        input: "does-not-exist",
                        routeMap: routeMap,
                    },
                );
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
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["routeName"], {
                    activeFlag: undefined,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and help text", () => {
                confirmRouteScanResult(
                    [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                    ["routeName", "--help"],
                    {
                        activeFlag: helpFlag,
                        target: camelCaseCommand,
                        prefix: ["cli", "routeName"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans camelCase route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                    ["routeName", "foo", "bar", "baz"],
                    {
                        activeFlag: undefined,
                        target: camelCaseCommand,
                        prefix: ["cli", "routeName"],
                        unprocessedInputs: ["foo", "bar", "baz"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name", () => {
                confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["route-name"], {
                    activeFlag: undefined,
                    target: kebabCaseCommand,
                    prefix: ["cli", "route-name"],
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans kebab-case route with exact name and help flag", () => {
                confirmRouteScanResult(
                    [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                    ["route-name", "--help"],
                    {
                        activeFlag: helpFlag,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, defaultScannerConfig, ["cli"], defaultFlags],
                    ["route-name", "foo", "bar", "baz"],
                    {
                        activeFlag: undefined,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
                        unprocessedInputs: ["foo", "bar", "baz"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });
        });

        describe("with 'allow-kebab-for-camel' case style", () => {
            const configWithAllowKebabForCamel = {
                ...defaultScannerConfig,
                caseStyle: "allow-kebab-for-camel",
            } satisfies ScannerConfiguration;

            it("scans camelCase route with exact name", () => {
                confirmRouteScanResult([routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags], ["routeName"], {
                    activeFlag: undefined,
                    target: camelCaseCommand,
                    prefix: ["cli", "routeName"],
                    unprocessedInputs: [],
                    aliases: { original: [], "convert-camel-to-kebab": [] },
                });
            });

            it("scans camelCase route with exact name and help flag", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["routeName", "--help"],
                    {
                        activeFlag: helpFlag,
                        target: camelCaseCommand,
                        prefix: ["cli", "routeName"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans camelCase route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["routeName", "foo", "bar", "baz"],
                    {
                        activeFlag: undefined,
                        target: camelCaseCommand,
                        prefix: ["cli", "routeName"],
                        unprocessedInputs: ["foo", "bar", "baz"],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["route-name"],
                    {
                        activeFlag: undefined,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name and help flag", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["route-name", "--help"],
                    {
                        activeFlag: helpFlag,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
                        unprocessedInputs: [],
                        aliases: { original: [], "convert-camel-to-kebab": [] },
                    },
                );
            });

            it("scans kebab-case route with exact name and unprocessed inputs", () => {
                confirmRouteScanResult(
                    [routeMap, configWithAllowKebabForCamel, ["cli"], defaultFlags],
                    ["route-name", "foo", "bar", "baz"],
                    {
                        activeFlag: undefined,
                        target: kebabCaseCommand,
                        prefix: ["cli", "route-name"],
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
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], [], {
                activeFlag: undefined,
                target: defaultCommand,
                prefix: ["cli"],
                unprocessedInputs: [],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans root as target with help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["--help"], {
                activeFlag: helpFlag,
                target: routeMap,
                prefix: ["cli"],
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
        it("scans default command as target with unprocessed inputs (value)", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["arg"], {
                activeFlag: undefined,
                target: defaultCommand,
                prefix: ["cli"],
                unprocessedInputs: ["arg"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans default command as target with unprocessed inputs (flag)", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["--flag"], {
                activeFlag: undefined,
                target: defaultCommand,
                prefix: ["cli"],
                unprocessedInputs: ["--flag"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans default command as target with explicit default route", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["default"], {
                activeFlag: undefined,
                target: defaultCommand,
                prefix: ["cli", "default"],
                unprocessedInputs: [],
                aliases: { original: [""], "convert-camel-to-kebab": [""] },
            });
        });
        it("scans default command as target with explicit default route with help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["default", "--help"], {
                activeFlag: helpFlag,
                target: defaultCommand,
                prefix: ["cli", "default"],
                unprocessedInputs: [],
                aliases: { original: [""], "convert-camel-to-kebab": [""] },
            });
        });
        it("scans default command as target with input that is adjacent to the default rotue", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["defaultx"], {
                activeFlag: undefined,
                target: defaultCommand,
                prefix: ["cli"],
                unprocessedInputs: ["defaultx"],
                aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
            });
        });
        it("scans non-default command as target with exact route", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["alternate"], {
                activeFlag: undefined,
                target: alternateCommand,
                prefix: ["cli", "alternate"],
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
        it("scans non-default command as target with exact route and help flag", () => {
            confirmRouteScanResult([routeMap, defaultScannerConfig, ["cli"], defaultFlags], ["alternate", "--help"], {
                activeFlag: helpFlag,
                target: alternateCommand,
                prefix: ["cli", "alternate"],
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            });
        });
    });
});
