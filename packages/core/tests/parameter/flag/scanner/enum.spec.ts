// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import type { CommandContext, TypedCommandParameters } from "../../../../src";
import {
    defaultCompletionConfig,
    defaultScannerConfig,
    testArgumentScannerParse,
    testCompletions,
} from "../../scanner";

describe("ArgumentScanner (enum flags)", () => {
    describe("optional", () => {
        type Positional = [];
        type Flags = {
            readonly mode?: "foo" | "bar" | "baz";
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    optional: true,
                    variadic: false,
                    default: "foo",
                    brief: "mode",
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
                    arguments: [{ mode: "foo" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: "bar" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: "bar" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: "baz" }],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mod=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "mod",
                                corrections: ["mode"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "--mode"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                nextFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=foo", "--mode=bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "foo", "--mode=bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=foo", "--mode", "bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "foo", "--mode", "bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "INVALID",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bat"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "bat",
                                values: ["foo", "bar", "baz"],
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
                expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { m: "mode" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: "baz" }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=a"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "EnumValidationError",
                                properties: {
                                    externalFlagName: "mode",
                                    input: "a",
                                    values: ["foo", "bar", "baz"],
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--mode=a", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "a",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--mode", "foo", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "--mode=bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "--mode", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
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
                    expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--mode", brief: "mode" },
                        { kind: "argument:flag", completion: "-m", brief: "mode" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "foo", brief: "mode" },
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
            });
        });
    });

    describe("required", () => {
        type Positional = [];
        type Flags = {
            readonly mode: "foo" | "bar" | "baz";
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    variadic: false,
                    default: "foo",
                    brief: "mode",
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
                    arguments: [{ mode: "foo" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: "bar" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: "bar" }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: "baz" }],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mod=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "mod",
                                corrections: ["mode"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "--mode"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                nextFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=foo", "--mode=bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "foo", "--mode=bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=foo", "--mode", "bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "foo", "--mode", "bar"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                previousInput: "foo",
                                input: "bar",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "INVALID",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bat"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "bat",
                                values: ["foo", "bar", "baz"],
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
                expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { m: "mode" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: "baz" }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=a"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "EnumValidationError",
                                properties: {
                                    externalFlagName: "mode",
                                    input: "a",
                                    values: ["foo", "bar", "baz"],
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--mode=a", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "a",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["--mode", "foo", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "--mode=bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "--mode", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "foo", "-m", "bar"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnexpectedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                    previousInput: "foo",
                                    input: "bar",
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
                    expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--mode", brief: "mode" },
                        { kind: "argument:flag", completion: "-m", brief: "mode" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "foo", brief: "mode" },
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
            });
        });
    });

    describe("optional variadic", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode?: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    optional: true,
                    brief: "mode",
                    variadic: true,
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
                    arguments: [{ mode: void 0 }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar", "--mode=baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar", "--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar", "--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mod=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "mod",
                                corrections: ["mode"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "--mode"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                nextFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "INVALID",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bat"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "bat",
                                values: ["foo", "bar", "baz"],
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
                expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { m: "mode" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["baz"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["baz"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "bar", "-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["bar", "baz"] }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=a"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "EnumValidationError",
                                properties: {
                                    externalFlagName: "mode",
                                    input: "a",
                                    values: ["foo", "bar", "baz"],
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
                    expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--mode", brief: "mode" },
                        { kind: "argument:flag", completion: "-m", brief: "mode" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "foo", brief: "mode" },
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
            });
        });
    });

    describe("required variadic", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    brief: "mode",
                    variadic: true,
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar", "--mode=baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar", "--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar", "--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
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
                                externalFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mod=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "mod",
                                corrections: ["mode"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "--mode"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedFlagError",
                            properties: {
                                externalFlagName: "mode",
                                nextFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "INVALID",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bat"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "bat",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
        });

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { m: "mode" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["baz"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["baz"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "bar", "-m", "baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["bar", "baz"] }],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "UnsatisfiedFlagError",
                                properties: {
                                    externalFlagName: "mode",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m=a"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "EnumValidationError",
                                properties: {
                                    externalFlagName: "mode",
                                    input: "a",
                                    values: ["foo", "bar", "baz"],
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
                    expected: [{ kind: "argument:flag", completion: "--mode", brief: "mode" }],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: [],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                    expected: [
                        { kind: "argument:flag", completion: "--mode", brief: "mode" },
                        { kind: "argument:flag", completion: "-m", brief: "mode" },
                    ],
                });

                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "foo", brief: "mode" },
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-m"],
                    partial: "b",
                    scannerConfig: defaultScannerConfig,
                    completionConfig: defaultCompletionConfig,
                    expected: [
                        { kind: "argument:value", completion: "bar", brief: "mode" },
                        { kind: "argument:value", completion: "baz", brief: "mode" },
                    ],
                });
            });
        });
    });

    describe("required variadic (separator)", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    brief: "mode",
                    variadic: ",",
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar,bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar", "--mode", "foo"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "foo"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar,bar", "--mode", "foo"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "bar", "foo"] }],
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
                                externalFlagName: "mode",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mod=100"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "mod",
                                corrections: ["mode"],
                            },
                        },
                    ],
                },
            });
        });

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--mode"],
                partial: "bar,",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "foo", brief: "mode" },
                    { kind: "argument:value", completion: "bar", brief: "mode" },
                    { kind: "argument:value", completion: "baz", brief: "mode" },
                ],
            });
        });

        describe("with alias", () => {
            const parametersWithAlias: TypedCommandParameters<Flags, Positional, CommandContext> = {
                ...parameters,
                aliases: { m: "mode" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "baz,baz"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["baz", "baz"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "bar", "-m", "foo"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["bar", "foo"] }],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-m", "bar,bar", "-m", "foo"],
                    expected: {
                        success: true,
                        arguments: [{ mode: ["bar", "bar", "foo"] }],
                    },
                });
            });
        });
    });

    describe("optional variadic with default", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode?: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    optional: true,
                    brief: "mode",
                    variadic: true,
                    default: ["foo", "bar"],
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
                    arguments: [{ mode: ["foo", "bar"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["baz"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode", "bar", "--mode", "baz"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar", "baz"] }],
                },
            });
        });
    });

    describe("required variadic with default", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    brief: "mode",
                    variadic: true,
                    default: ["foo"],
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
                    arguments: [{ mode: ["foo"] }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--mode=bar"],
                expected: {
                    success: true,
                    arguments: [{ mode: ["bar"] }],
                },
            });
        });
    });

    describe("required variadic with invalid default", () => {
        type Positional = [];
        type MyEnum = "foo" | "bar" | "baz";
        type Flags = {
            readonly mode: MyEnum[];
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                mode: {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    brief: "mode",
                    variadic: true,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    default: ["foo", "invalid"] as any,
                },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments throws EnumValidationError for invalid default", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "EnumValidationError",
                            properties: {
                                externalFlagName: "mode",
                                input: "invalid",
                                values: ["foo", "bar", "baz"],
                            },
                        },
                    ],
                },
            });
        });
    });
});
