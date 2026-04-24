// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    AliasNotFoundError,
    ArgumentParseError,
    type CommandContext,
    EnumValidationError,
    FlagNotFoundError,
    formatMessageForArgumentScannerError,
    InvalidNegatedFlagSyntaxError,
    type TypedCommandParameters,
    UnexpectedFlagError,
    UnexpectedPositionalError,
    UnsatisfiedFlagError,
    UnsatisfiedPositionalError,
} from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { ExternalFlagName, Placeholder } from "../../src/parameter/scanner";
import { defaultCompletionConfig, defaultScannerConfig, testArgumentScannerParse, testCompletions } from "./scanner";

describe("ArgumentScanner", () => {
    describe("mixed", () => {
        describe("required counter flag", () => {
            type Positional = [];
            type Flags = {
                readonly logLevel: number;
            };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    logLevel: { kind: "counter", brief: "logLevel" },
                },
                aliases: {
                    l: "logLevel",
                },
                positional: { kind: "tuple", parameters: [] },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ logLevel: 0 }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["-l"],
                    expected: {
                        success: true,
                        arguments: [{ logLevel: 1 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["-ll"],
                    expected: {
                        success: true,
                        arguments: [{ logLevel: 2 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["-l", "-l"],
                    expected: {
                        success: true,
                        arguments: [{ logLevel: 2 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["-ll", "-ll"],
                    expected: {
                        success: true,
                        arguments: [{ logLevel: 4 }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 1,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel", "--logLevel"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 2,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel=100"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 100,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel=100", "--logLevel"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 101,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel", "-l"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 2,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel", "-ll"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 3,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel=100", "-l"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 101,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel=100", "-ll"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 102,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 1,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level", "--log-level"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 2,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level=100"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 100,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level=100", "--log-level"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 101,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level", "-l"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 2,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level", "-ll"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 3,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level=100", "-l"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 101,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                    inputs: ["--log-level=100", "-ll"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                logLevel: 102,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--loglevel"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "loglevel",
                                    corrections: ["logLevel"],
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--ll"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "ll",
                                    corrections: ["logLevel"],
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--logLevel=high"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "ArgumentParseError",
                                properties: {
                                    externalFlagNameOrPlaceholder: "logLevel",
                                    input: "high",
                                    exception: new Error("Cannot convert high to a number"),
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "--l",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: ["--logLevel"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--logLevel", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-l", brief: "logLevel" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--logLevel", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-l", brief: "logLevel" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "-l",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "-l", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-ll", brief: "logLevel" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "-ll",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "-ll", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-lll", brief: "logLevel" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: [],
                    partial: "--l",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [{ kind: "argument:flag", completion: "--logLevel", brief: "logLevel" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: ["--logLevel"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--logLevel", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-l", brief: "logLevel" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters,
                    inputs: ["-l"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--logLevel", brief: "logLevel" },
                        { kind: "argument:flag", completion: "-l", brief: "logLevel" },
                    ],
                });
            });
        });

        describe("optional flags, positional array of strings", () => {
            type Positional = string[];
            type Flags = {
                readonly foo: boolean;
                readonly bar?: string;
            };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    foo: { kind: "boolean", brief: "foo" },
                    bar: { kind: "parsed", brief: "bar", parse: String, optional: true },
                },
                positional: {
                    kind: "array",
                    parameter: {
                        brief: "string",
                        parse: String,
                    },
                },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ foo: false, bar: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: true, bar: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--", "--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: true, bar: void 0 }, "--"],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--bar", "--", "--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: true, bar: "--" }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "--", "--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    input: "true",
                                    previousInput: "true",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ foo: false, bar: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    inputs: ["--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: true, bar: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    inputs: ["--", "--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: false, bar: void 0 }, "--foo"],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    inputs: ["--foo", "--", "--foo"],
                    expected: {
                        success: true,
                        arguments: [{ foo: true, bar: void 0 }, "--foo"],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    inputs: ["--bar", "--", "--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "bar",
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    ],
                });
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "--",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    ],
                });
                await testCompletions({
                    parameters,
                    inputs: ["--"],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
            });

            describe("with alias", () => {
                const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    ...parameters,
                    aliases: { f: "foo", b: "bar" },
                };

                it("parseArguments", async () => {
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: defaultScannerConfig,
                        inputs: [],
                        expected: {
                            success: true,
                            arguments: [{ foo: false, bar: void 0 }],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: defaultScannerConfig,
                        inputs: ["-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: true, bar: void 0 }],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: defaultScannerConfig,
                        inputs: ["--", "-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: true, bar: void 0 }, "--"],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: defaultScannerConfig,
                        inputs: ["-b", "--", "-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: true, bar: "--" }],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: defaultScannerConfig,
                        inputs: ["-f", "--", "-f"],
                        expected: {
                            success: false,
                            errors: [
                                {
                                    type: "UnexpectedFlagError",
                                    properties: {
                                        externalFlagName: "foo",
                                        input: "true",
                                        previousInput: "true",
                                    },
                                },
                            ],
                        },
                    });

                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        inputs: [],
                        expected: {
                            success: true,
                            arguments: [{ foo: false, bar: void 0 }],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        inputs: ["-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: true, bar: void 0 }],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        inputs: ["--", "-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: false, bar: void 0 }, "-f"],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        inputs: ["-f", "--", "-f"],
                        expected: {
                            success: true,
                            arguments: [{ foo: true, bar: void 0 }, "-f"],
                        },
                    });
                    await testArgumentScannerParse<Flags, Positional>({
                        parameters: parametersWithAlias,
                        config: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        inputs: ["-b", "--", "-f"],
                        expected: {
                            success: false,
                            errors: [
                                {
                                    type: "UnsatisfiedFlagError",
                                    properties: {
                                        externalFlagName: "bar",
                                    },
                                },
                            ],
                        },
                    });
                });

                it("proposeCompletions", async () => {
                    await testCompletions({
                        parameters: parametersWithAlias,
                        inputs: [],
                        partial: "",
                        scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                        expected: [
                            {
                                kind: "argument:flag",
                                completion: "--",
                                brief: "All subsequent inputs should be interpreted as arguments",
                            },
                            { kind: "argument:flag", completion: "--bar", brief: "bar" },
                            { kind: "argument:flag", completion: "-b", brief: "bar" },
                            { kind: "argument:flag", completion: "--foo", brief: "foo" },
                            { kind: "argument:flag", completion: "-f", brief: "foo" },
                        ],
                    });
                    await testCompletions({
                        parameters: parametersWithAlias,
                        inputs: [],
                        partial: "--",
                        scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                        expected: [
                            {
                                kind: "argument:flag",
                                completion: "--",
                                brief: "All subsequent inputs should be interpreted as arguments",
                            },
                            { kind: "argument:flag", completion: "--bar", brief: "bar" },
                            { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        ],
                    });
                    await testCompletions({
                        parameters: parametersWithAlias,
                        inputs: ["--"],
                        partial: "",
                        scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                        completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                        expected: [],
                    });
                });
            });
        });

        describe("required flags, tuple of strings", () => {
            type Positional = [string, string?];
            type Flags = { foo: string; bar: string };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    foo: {
                        kind: "parsed",
                        brief: "foo",
                        parse: String,
                    },
                    bar: {
                        kind: "parsed",
                        brief: "bar",
                        parse: String,
                    },
                },
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            placeholder: "a",
                            brief: "a",
                            parse: String,
                        },
                        {
                            placeholder: "b",
                            brief: "b",
                            parse: () => {
                                throw new Error("Failed to parse input");
                            },
                            optional: true,
                        },
                    ],
                },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedPositionalError",
                                properties: {
                                    placeholder: "a",
                                },
                            },
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "bar",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["100"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "bar",
                                },
                            },
                        ],
                    },
                });
            });
        });
    });

    describe("empty", () => {
        describe("with spec", () => {
            type Positional = [];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{}],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "foo",
                                    corrections: [],
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                    ],
                });
            });
        });

        describe("without flag spec", () => {
            type Positional = [];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{}],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "foo",
                                    corrections: [],
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                    ],
                });
            });
        });

        describe("without positional spec", () => {
            type Positional = [];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{}],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "foo",
                                    corrections: [],
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                    ],
                });
            });
        });

        describe("without specs", () => {
            type Positional = [];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {};

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{}],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "foo",
                                    corrections: [],
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions({
                    parameters,
                    inputs: [],
                    partial: "",
                    scannerConfig: { ...defaultScannerConfig, allowArgumentEscapeSequence: true },
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        {
                            kind: "argument:flag",
                            completion: "--",
                            brief: "All subsequent inputs should be interpreted as arguments",
                        },
                    ],
                });
            });
        });
    });
});

describe("formatMessageForArgumentScannerError", () => {
    describe("AliasNotFoundError", () => {
        it("default message", () => {
            // GIVEN
            const error = new AliasNotFoundError("x");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("No alias registered for -x");
        });

        it("custom message", () => {
            // GIVEN
            const error = new AliasNotFoundError("x");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                AliasNotFoundError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("ArgumentParseError", () => {
        it("default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const input = "1";
            const exception = new Error("Parse failed");
            const error = new ArgumentParseError(externalFlagName, input, exception);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Failed to parse "1" for foo: Parse failed');
        });

        it("non-Error, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const input = "1";
            const exception = "Parse failed";
            const error = new ArgumentParseError(externalFlagName, input, exception);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Failed to parse "1" for foo: Parse failed');
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const input = "1";
            const exception = new Error("Parse failed");
            const error = new ArgumentParseError(externalFlagName, input, exception);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                ArgumentParseError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("EnumValidationError", () => {
        it("default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new EnumValidationError(externalFlagName, "x", ["a", "b", "c"], ["a", "b", "c"]);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Expected "x" to be one of (a|b|c), did you mean "a", "b", or "c"?');
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new EnumValidationError(externalFlagName, "x", ["a", "b", "c"], ["a", "b", "c"]);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                EnumValidationError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("FlagNotFoundError", () => {
        it("no corrections, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const corrections: string[] = [];
            const error = new FlagNotFoundError(externalFlagName, corrections);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("No flag registered for --foo");
        });

        it("corrections, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const corrections = ["for", "goo"];
            const error = new FlagNotFoundError(externalFlagName, corrections);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("No flag registered for --foo, did you mean --for or --goo?");
        });

        it("no corrections with alias, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const corrections: string[] = [];
            const error = new FlagNotFoundError(externalFlagName, corrections, "f");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("No flag registered for --foo (aliased from -f)");
        });

        it("corrections with alias, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const corrections = ["for", "goo"];
            const error = new FlagNotFoundError(externalFlagName, corrections, "f");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("No flag registered for --foo (aliased from -f)");
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const corrections: string[] = [];
            const error = new FlagNotFoundError(externalFlagName, corrections);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                FlagNotFoundError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("InvalidNegatedFlagSyntaxError", () => {
        it("default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const valueText = "no";
            const error = new InvalidNegatedFlagSyntaxError(externalFlagName, valueText);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Cannot negate flag --foo and pass "no" as value');
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const valueText = "no";
            const error = new InvalidNegatedFlagSyntaxError(externalFlagName, valueText);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                InvalidNegatedFlagSyntaxError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("UnexpectedFlagError", () => {
        it("default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new UnexpectedFlagError(externalFlagName, "prev", "next");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Too many arguments for --foo, encountered "next" after "prev"');
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new UnexpectedFlagError(externalFlagName, "prev", "next");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                UnexpectedFlagError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("UnexpectedPositionalError", () => {
        it("default message", () => {
            // GIVEN
            const error = new UnexpectedPositionalError(1, "foo");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal('Too many arguments, expected 1 but encountered "foo"');
        });

        it("custom message", () => {
            // GIVEN
            const error = new UnexpectedPositionalError(1, "foo");

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                UnexpectedPositionalError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("UnsatisfiedFlagError", () => {
        it("no next, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new UnsatisfiedFlagError(externalFlagName);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("Expected input for flag --foo");
        });

        it("next, default message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const nextFlagName = "bar" as ExternalFlagName;
            const error = new UnsatisfiedFlagError(externalFlagName, nextFlagName);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("Expected input for flag --foo but encountered --bar instead");
        });

        it("custom message", () => {
            // GIVEN
            const externalFlagName = "foo" as ExternalFlagName;
            const error = new UnsatisfiedFlagError(externalFlagName);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                UnsatisfiedFlagError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    describe("UnsatisfiedPositionalError", () => {
        it("no limit, default message", () => {
            // GIVEN
            const placeholder = "foo" as Placeholder;
            const error = new UnsatisfiedPositionalError(placeholder);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("Expected argument for foo");
        });

        it("limit with some count, default message", () => {
            // GIVEN
            const placeholder = "foo" as Placeholder;
            const error = new UnsatisfiedPositionalError(placeholder, [2, 1]);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("Expected at least 2 argument(s) for foo but only found 1");
        });

        it("limit with no count, default message", () => {
            // GIVEN
            const placeholder = "foo" as Placeholder;
            const error = new UnsatisfiedPositionalError(placeholder, [2, 0]);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {});

            // THEN
            expect(message).to.equal("Expected at least 2 argument(s) for foo but found none");
        });

        it("custom message", () => {
            // GIVEN
            const placeholder = "foo" as Placeholder;
            const error = new UnsatisfiedPositionalError(placeholder);

            // WHEN
            const message = formatMessageForArgumentScannerError(error, {
                UnsatisfiedPositionalError: (err) => {
                    expect(err).to.equal(error);
                    return "CUSTOM ERROR MESSAGE";
                },
            });

            // THEN
            expect(message).to.equal("CUSTOM ERROR MESSAGE");
        });
    });

    it("default message for unexpected error", () => {
        // GIVEN
        const error = new SyntaxError("Unexpected error");

        // WHEN
        const message = formatMessageForArgumentScannerError(error as any, {});

        // THEN
        expect(message).to.equal("Unexpected error");
    });
});
