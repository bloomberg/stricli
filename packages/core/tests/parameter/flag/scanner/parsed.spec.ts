// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import { type CommandContext, numberParser, type TypedCommandParameters } from "../../../../src";
import {
    defaultCompletionConfig,
    defaultScannerConfig,
    testArgumentScannerParse,
    testCompletions,
} from "../../scanner";

describe("ArgumentScanner (parsed flags)", () => {
    describe("required", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number;
            readonly bar: number;
            readonly baz: number;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "foo",
                },
                bar: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "bar",
                },
                baz: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "baz",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: 100,
                            bar: 200,
                            baz: 300,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--bar", "200", "--baz", "300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: 100,
                            bar: 200,
                            baz: 300,
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
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
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
                            },
                        },
                    ],
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
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrong=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrong",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fo=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "fo",
                                corrections: ["foo"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "--foo"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                nextFlagName: "foo",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo=200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "foo",
                                input: "INVALID",
                                exception: new Error("Cannot convert INVALID to a number"),
                            },
                        },
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "bar",
                            },
                        },
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
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
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
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
                    inputs: ["-f", "100", "--bar", "200", "--baz", "300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: 100,
                                bar: 200,
                                baz: 300,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
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
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "baz",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=100", "--bar", "200", "--baz", "300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: 100,
                                bar: 200,
                                baz: 300,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo=100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo=200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-fb"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-bf"],
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
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "-b", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "-b", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
            });
        });
    });

    describe("required (string)", () => {
        type Positional = [];
        type Flags = {
            readonly text: string;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                text: {
                    kind: "parsed",
                    parse: String,
                    brief: "text",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text", ""],
                expected: {
                    success: true,
                    arguments: [
                        {
                            text: "",
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text= "],
                expected: {
                    success: true,
                    arguments: [
                        {
                            text: " ",
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text=./dir"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            text: "./dir",
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text=`~!@#$%^&*()-_+="],
                expected: {
                    success: true,
                    arguments: [
                        {
                            text: "`~!@#$%^&*()-_+=",
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "text",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "text",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text", "--text"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "text",
                                nextFlagName: "text",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text=a", "--text=b"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "text",
                                previousInput: "a",
                                input: "b",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text", "a", "--text=b"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "text",
                                previousInput: "a",
                                input: "b",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text=a", "--text", "b"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "text",
                                previousInput: "a",
                                input: "b",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--text", "a", "--text", "b"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "text",
                                previousInput: "a",
                                input: "b",
                            },
                        },
                    ],
                },
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { t: "text" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t= "],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                text: " ",
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t=./dir"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                text: "./dir",
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t=`~!@#$%^&*()-_+="],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                text: "`~!@#$%^&*()-_+=",
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t", "-t"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                    nextFlagName: "text",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t=a", "-t=b"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                    previousInput: "a",
                                    input: "b",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t", "a", "-t=b"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                    previousInput: "a",
                                    input: "b",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t=a", "-t", "b"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                    previousInput: "a",
                                    input: "b",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-t", "a", "-t", "b"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "text",
                                    previousInput: "a",
                                    input: "b",
                                },
                            },
                        ],
                    },
                });
            });
        });
    });

    describe("optional", () => {
        type Positional = [];
        type Flags = {
            readonly foo?: number;
            readonly bar?: number;
            readonly baz?: number;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "foo",
                    optional: true,
                },
                bar: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "bar",
                    optional: true,
                },
                baz: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "baz",
                    optional: true,
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: 100,
                            bar: 200,
                            baz: 300,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--bar", "200", "--baz", "300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: 100,
                            bar: 200,
                            baz: 300,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: void 0,
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
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
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrong=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrong",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fo=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "fo",
                                corrections: ["foo"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "--foo"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                nextFlagName: "foo",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo=200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                previousInput: "100",
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "foo",
                                input: "INVALID",
                                exception: new Error("Cannot convert INVALID to a number"),
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
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
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
                    inputs: ["-f", "100", "--bar", "200", "--baz", "300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: 100,
                                bar: 200,
                                baz: 300,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=100", "--bar", "200", "--baz", "300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: 100,
                                bar: 200,
                                baz: 300,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo=100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo=200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f", "200"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                    previousInput: "100",
                                    input: "200",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-fb"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-bf"],
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
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "-b", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "-b", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
            });
        });
    });

    describe("optional (string)", () => {
        type Positional = [];
        type Flags = {
            readonly foo?: string;
            readonly bar?: string;
            readonly baz?: string;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: String,
                    brief: "foo",
                    optional: true,
                },
                bar: {
                    kind: "parsed",
                    parse: String,
                    brief: "bar",
                    optional: true,
                },
                baz: {
                    kind: "parsed",
                    parse: String,
                    brief: "baz",
                    optional: true,
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--bar", "--baz=300", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "bar",
                                nextFlagName: "baz",
                            },
                        },
                    ],
                },
            });
        });

        describe("inferEmpty", () => {
            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    foo: {
                        kind: "parsed",
                        parse: String,
                        brief: "foo",
                        optional: true,
                        inferEmpty: true,
                    },
                    bar: {
                        kind: "parsed",
                        parse: String,
                        brief: "bar",
                        optional: true,
                        inferEmpty: true,
                    },
                    baz: {
                        kind: "parsed",
                        parse: String,
                        brief: "baz",
                        optional: true,
                        inferEmpty: true,
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "--bar", "--baz"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: "",
                                bar: "",
                                baz: "",
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: {
                        ...defaultScannerConfig,
                        allowArgumentEscapeSequence: true,
                    },
                    inputs: ["--foo", "--bar", "--"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: "",
                                bar: "",
                                baz: void 0,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["--foo=100", "--bar", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: "100",
                                bar: "",
                                baz: "300",
                            },
                        ],
                    },
                });
            });
        });
    });

    describe("optional variadic with default", () => {
        type Positional = [];
        type Flags = {
            readonly foo?: number[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    optional: true,
                    brief: "foo",
                    default: ["1", "2", "3"],
                },
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
                    arguments: [{ foo: [1, 2, 3] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=42"],
                expected: {
                    success: true,
                    arguments: [{ foo: [42] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "10", "--foo", "20"],
                expected: {
                    success: true,
                    arguments: [{ foo: [10, 20] }],
                },
            });
        });
    });

    describe("required variadic with default", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    brief: "foo",
                    default: ["5"],
                },
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
                    arguments: [{ foo: [5] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100] }],
                },
            });
        });
    });

    describe("with default (string)", () => {
        type Positional = [];
        type Flags = {
            readonly foo: string;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: String,
                    default: "",
                    brief: "limit",
                },
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
                    arguments: [{ foo: "" }],
                },
            });
        });
    });

    describe("with default", () => {
        type Positional = [];
        type Flags = {
            readonly limit: number;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                limit: {
                    kind: "parsed",
                    parse: numberParser,
                    default: "0",
                    brief: "limit",
                },
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
                    arguments: [{ limit: 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit=100"],
                expected: {
                    success: true,
                    arguments: [{ limit: 100 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit", "100"],
                expected: {
                    success: true,
                    arguments: [{ limit: 100 }],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "limit",
                            },
                        },
                    ],
                },
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { l: "limit" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ limit: 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-l", "100"],
                    expected: {
                        success: true,
                        arguments: [{ limit: 100 }],
                    },
                });
            });
        });
    });

    describe("optional", () => {
        type Positional = [];
        type Flags = {
            readonly limit?: number;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                limit: {
                    kind: "parsed",
                    parse: numberParser,
                    optional: true,
                    brief: "limit",
                },
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
                    arguments: [{ limit: void 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit=100"],
                expected: {
                    success: true,
                    arguments: [{ limit: 100 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit", "100"],
                expected: {
                    success: true,
                    arguments: [{ limit: 100 }],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--limit"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "limit",
                            },
                        },
                    ],
                },
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { l: "limit" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                limit: void 0 as number | undefined,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-l", "100"],
                    expected: {
                        success: true,
                        arguments: [{ limit: 100 }],
                    },
                });
            });
        });
    });

    describe("optional variadic", () => {
        type Positional = [];
        type Flags = {
            readonly foo?: number[];
            readonly bar?: number[];
            readonly baz?: number[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    optional: true,
                    brief: "foo",
                },
                bar: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    optional: true,
                    brief: "bar",
                },
                baz: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    optional: true,
                    brief: "baz",
                },
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
                    arguments: [{ foo: void 0, bar: void 0, baz: void 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100], bar: void 0, baz: void 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100],
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo=200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo", "200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo", "200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                            bar: void 0,
                            baz: void 0,
                        },
                    ],
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
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
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
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { f: "foo" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ foo: void 0, bar: void 0, baz: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo=100", "-f", "200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "100", "-f", "200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo=200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo", "200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f", "200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                                bar: void 0,
                                baz: void 0,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
            });
        });
    });

    describe("required variadic", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number[];
            readonly bar: number[];
            readonly baz: number[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    brief: "foo",
                },
                bar: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    brief: "bar",
                },
                baz: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: true,
                    brief: "baz",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100], bar: [200], baz: [300] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--bar=200", "--baz=300", "--foo", "100"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 100],
                            bar: [200],
                            baz: [300],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 100],
                            bar: [200],
                            baz: [300],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo=100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 100],
                            bar: [200],
                            baz: [300],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo", "100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 100],
                            bar: [200],
                            baz: [300],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100", "--foo", "100", "--bar=200", "--baz=300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 100],
                            bar: [200],
                            baz: [300],
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
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
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
                            },
                        },
                    ],
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
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo"],
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
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "baz",
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
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { f: "foo" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo=100", "-f", "100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--foo", "100", "-f", "100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo=100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "--foo", "100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f", "100", "--bar=200", "--baz=300"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 100],
                                bar: [200],
                                baz: [300],
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
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
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "baz",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
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
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "baz",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f"],
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
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "baz",
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
            });
        });
    });

    describe("required variadic (separator)", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    variadic: ",",
                    brief: "foo",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=200"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100, 200] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100,200", "--foo", "300"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200, 300],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100,200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                        },
                    ],
                },
            });
        });
    });

    describe("optional variadic", () => {
        type Positional = [];
        type Flags = {
            readonly foo?: number[];
        };

        const numberArrayParser = (values: string) => values.split(",").map((value) => numberParser(value));

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberArrayParser,
                    optional: true,
                    brief: "foo",
                },
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
                    arguments: [{ foo: void 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100,200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo", "100,200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                        },
                    ],
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
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
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
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { f: "foo" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [{ foo: void 0 }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100,200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [],
                });
            });
        });
    });

    describe("required array", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number[];
        };

        const numberArrayParser = (values: string) => values.split(",").map((value) => numberParser(value));

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberArrayParser,
                    brief: "foo",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100"],
                expected: {
                    success: true,
                    arguments: [{ foo: [100] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100,200"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo: [100, 200],
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
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
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "foo",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo=100", "--foo=200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "foo",
                                input: "200",
                                previousInput: "100",
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
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { f: "foo" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100],
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100,200"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                foo: [100, 200],
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f", "100", "-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "foo",
                                },
                            },
                        ],
                    },
                });
            });

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [],
                });
            });
        });
    });

    describe("with custom completions", () => {
        type Positional = [];
        type Flags = {
            readonly foo: number;
            readonly bar: number;
            readonly baz: number;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "foo",
                    proposeCompletions: (partial: string) => [`${partial}0`, `${partial}00`],
                },
                bar: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "bar",
                },
                baz: {
                    kind: "parsed",
                    parse: numberParser,
                    brief: "baz",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo", brief: "foo" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo", brief: "foo" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                context: {} as CommandContext,
                inputs: ["--foo"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "0", brief: "foo" },
                    { kind: "argument:value", completion: "00", brief: "foo" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                context: {} as CommandContext,
                inputs: ["--foo"],
                partial: "1",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "10", brief: "foo" },
                    { kind: "argument:value", completion: "100", brief: "foo" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo", "100"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { f: "foo" },
            };

            it("proposeCompletions", async () => {
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "-f", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--foo", brief: "foo" },
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    context: {} as CommandContext,
                    inputs: ["-f"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "0", brief: "foo" },
                        { kind: "argument:value", completion: "00", brief: "foo" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    context: {} as CommandContext,
                    inputs: ["-f"],
                    partial: "1",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "10", brief: "foo" },
                        { kind: "argument:value", completion: "100", brief: "foo" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "-",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f", "100"],
                    partial: "--b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
            });
        });
    });

    describe("with custom completions (using command context)", () => {
        type Positional = [];
        type Flags = {
            readonly project: string;
        };
        type CustomContext = CommandContext & {
            getUserProjects(): readonly string[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CustomContext> = {
            flags: {
                project: {
                    kind: "parsed",
                    parse: String,
                    brief: "project",
                    proposeCompletions(this: CustomContext, partial: string) {
                        return this.getUserProjects().filter((project) => project.startsWith(partial));
                    },
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        const context = {
            getUserProjects() {
                return ["my-project-a", "my-project-b", "extra-project"];
            },
        } as unknown as CustomContext;

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional, CustomContext>({
                parameters,
                context,
                inputs: ["--project"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "my-project-a", brief: "project" },
                    { kind: "argument:value", completion: "my-project-b", brief: "project" },
                    { kind: "argument:value", completion: "extra-project", brief: "project" },
                ],
            });
            await testCompletions<Flags, Positional, CustomContext>({
                parameters,
                context,
                inputs: ["--project"],
                partial: "my",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "my-project-a", brief: "project" },
                    { kind: "argument:value", completion: "my-project-b", brief: "project" },
                ],
            });
        });
    });
});
