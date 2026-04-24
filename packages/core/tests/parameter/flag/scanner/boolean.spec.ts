// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import type { CommandContext, TypedCommandParameters } from "../../../../src";
import {
    defaultCompletionConfig,
    defaultScannerConfig,
    testArgumentScannerParse,
    testCompletionError,
    testCompletions,
} from "../../scanner";

describe("ArgumentScanner (boolean flags)", () => {
    describe("required", () => {
        type Positional = [];
        type Flags = {
            readonly fooFlag: boolean;
            readonly bar: boolean;
            readonly baz: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                fooFlag: { kind: "boolean", brief: "fooFlag" },
                bar: { kind: "boolean", brief: "bar" },
                baz: { kind: "boolean", brief: "baz" },
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
                    arguments: [{ fooFlag: false, bar: false, baz: false }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=y"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=No"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--fooFlag"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--fooFlag=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--fooFlag=y"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--fooFlag=No"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo-flag"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo-flag=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo-flag=y"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: true,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo-flag=No"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            fooFlag: false,
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrong"],
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
                inputs: ["--wrong-flag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrong-flag",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrongFlag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrongFlag",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--wrong-flag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrong-flag",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--wrongFlag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrongFlag",
                                corrections: [],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo-flag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "foo-flag",
                                corrections: ["fooFlag"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo-flag=false"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "foo-flag",
                                corrections: ["fooFlag"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--bad"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "bad",
                                corrections: ["bar", "baz"],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag", "true"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedPositionalError",
                            properties: {
                                expectedCount: 0,
                                input: "true",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=enable"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "fooFlag",
                                input: "enable",
                                exception: new Error("Cannot convert enable to a boolean"),
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=✅"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "fooFlag",
                                input: "✅",
                                exception: new Error("Cannot convert ✅ to a boolean"),
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--fooFlag=❌"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "fooFlag",
                                input: "❌",
                                exception: new Error("Cannot convert ❌ to a boolean"),
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
                    { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                    { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                    { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                expected: [{ kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" }],
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
                inputs: [],
                partial: "",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo-flag", brief: "fooFlag" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo-flag", brief: "fooFlag" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--foo-flag", brief: "fooFlag" },
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo-flag", brief: "fooFlag" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--foo-",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo-flag", brief: "fooFlag" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--fooO",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--fooFlag"],
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
                inputs: ["--fooFlag"],
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
                inputs: ["--fooFlag"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:flag", completion: "--bar", brief: "bar" },
                    { kind: "argument:flag", completion: "--baz", brief: "baz" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--fooFlag"],
                partial: "--b",
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
                aliases: { f: "fooFlag" },
            };

            it("parseArguments", async () => {
                await testArgumentScannerParse<Flags, Positional>({
                    parameters,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "AliasNotFoundError",
                                properties: {
                                    input: "f",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: [],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                fooFlag: false,
                                bar: false,
                                baz: false,
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                fooFlag: true,
                                bar: false,
                                baz: false,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-g"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "AliasNotFoundError",
                                properties: {
                                    input: "g",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: {
                        ...parametersWithAlias,
                        aliases: { f: "goo" } as {},
                    } as typeof parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "goo",
                                    corrections: [],
                                    aliasName: "f",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-g=true"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "AliasNotFoundError",
                                properties: {
                                    input: "g",
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: {
                        ...parametersWithAlias,
                        aliases: { f: "goo" } as {},
                    } as typeof parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=true"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "FlagNotFoundError",
                                properties: {
                                    input: "goo",
                                    corrections: [],
                                    aliasName: "f",
                                },
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=true"],
                    expected: {
                        success: true,
                        arguments: [
                            {
                                fooFlag: true,
                                bar: false,
                                baz: false,
                            },
                        ],
                    },
                });

                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=enable"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "ArgumentParseError",
                                properties: {
                                    externalFlagNameOrPlaceholder: "fooFlag",
                                    input: "enable",
                                    exception: new Error("Cannot convert enable to a boolean"),
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=✅"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "ArgumentParseError",
                                properties: {
                                    externalFlagNameOrPlaceholder: "fooFlag",
                                    input: "✅",
                                    exception: new Error("Cannot convert ✅ to a boolean"),
                                },
                            },
                        ],
                    },
                });
                await testArgumentScannerParse<Flags, Positional>({
                    parameters: parametersWithAlias,
                    config: defaultScannerConfig,
                    inputs: ["-f=❌"],
                    expected: {
                        success: false,
                        errors: [
                            {
                                type: "ArgumentParseError",
                                properties: {
                                    externalFlagNameOrPlaceholder: "fooFlag",
                                    input: "❌",
                                    exception: new Error("Cannot convert ❌ to a boolean"),
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
                        { kind: "argument:flag", completion: "-f", brief: "fooFlag" },
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
                        { kind: "argument:flag", completion: "-f", brief: "fooFlag" },
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
                        { kind: "argument:flag", completion: "--fooFlag", brief: "fooFlag" },
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
                    expected: [
                        { kind: "argument:flag", completion: "--bar", brief: "bar" },
                        { kind: "argument:flag", completion: "--baz", brief: "baz" },
                    ],
                });
                await testCompletions<Flags, Positional>({
                    parameters: parametersWithAlias,
                    inputs: ["-f"],
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
                    inputs: ["-f"],
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
                    inputs: ["-f"],
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

    describe("multiple required with aliases", () => {
        type Positional = [];
        type Flags = {
            readonly alpha: boolean;
            readonly bravo: boolean;
            readonly charlie: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                alpha: { kind: "boolean", brief: "alpha" },
                bravo: { kind: "boolean", brief: "bravo" },
                charlie: { kind: "boolean", brief: "charlie" },
            },
            aliases: {
                a: "alpha",
                b: "bravo",
                c: "charlie",
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                expected: [
                    { kind: "argument:flag", completion: "--alpha", brief: "alpha" },
                    { kind: "argument:flag", completion: "-a", brief: "alpha" },
                    { kind: "argument:flag", completion: "--bravo", brief: "bravo" },
                    { kind: "argument:flag", completion: "-b", brief: "bravo" },
                    { kind: "argument:flag", completion: "--charlie", brief: "charlie" },
                    { kind: "argument:flag", completion: "-c", brief: "charlie" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                expected: [
                    { kind: "argument:flag", completion: "--alpha", brief: "alpha" },
                    { kind: "argument:flag", completion: "-a", brief: "alpha" },
                    { kind: "argument:flag", completion: "--bravo", brief: "bravo" },
                    { kind: "argument:flag", completion: "-b", brief: "bravo" },
                    { kind: "argument:flag", completion: "--charlie", brief: "charlie" },
                    { kind: "argument:flag", completion: "-c", brief: "charlie" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-a",
                scannerConfig: defaultScannerConfig,
                completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                expected: [
                    { kind: "argument:flag", completion: "-a", brief: "alpha" },
                    { kind: "argument:flag", completion: "-ab", brief: "bravo" },
                    { kind: "argument:flag", completion: "-ac", brief: "charlie" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["-a"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                expected: [
                    { kind: "argument:flag", completion: "--bravo", brief: "bravo" },
                    { kind: "argument:flag", completion: "-b", brief: "bravo" },
                    { kind: "argument:flag", completion: "--charlie", brief: "charlie" },
                    { kind: "argument:flag", completion: "-c", brief: "charlie" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["-a"],
                partial: "-b",
                scannerConfig: defaultScannerConfig,
                completionConfig: { ...defaultCompletionConfig, includeAliases: true },
                expected: [
                    { kind: "argument:flag", completion: "-b", brief: "bravo" },
                    { kind: "argument:flag", completion: "-bc", brief: "charlie" },
                ],
            });
        });

        testCompletionError<Flags, Positional>({
            parameters,
            inputs: ["-a"],
            partial: "-a",
            scannerConfig: defaultScannerConfig,
            completionConfig: { ...defaultCompletionConfig, includeAliases: true },

            expected: {
                type: "UnexpectedFlagError",
                properties: {
                    externalFlagName: "alpha",
                    input: "true",
                    previousInput: "true",
                },
            },
        });

        testCompletionError<Flags, Positional>({
            parameters,
            inputs: [],
            partial: "-x",
            scannerConfig: defaultScannerConfig,
            completionConfig: { ...defaultCompletionConfig, includeAliases: true },

            expected: {
                type: "AliasNotFoundError",
                properties: {
                    input: "x",
                },
            },
        });
    });

    describe("required with alphanumeric name", () => {
        type Positional = [];
        type Flags = {
            readonly foo1: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                foo1: { kind: "boolean", brief: "foo1" },
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
                    arguments: [{ foo1: false }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo1"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo1=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo1=y"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--foo1=No"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo1"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo1=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo1=y"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--foo1=No"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            foo1: false,
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrong"],
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
                inputs: ["--wrong-flag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrong-flag",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--wrongFlag"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "wrongFlag",
                                corrections: [],
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
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
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
                inputs: [],
                partial: "",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--foo1", brief: "foo1" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--fooO",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--b",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [],
            });

            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo1"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo1"],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo1"],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["--foo1"],
                partial: "--b",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });
    });

    describe("optional", () => {
        type Positional = [];
        type Flags = {
            readonly forceBuild: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                forceBuild: { kind: "boolean", brief: "forceBuild" },
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
                    arguments: [{ forceBuild: false }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--forceBuild"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            forceBuild: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noForceBuild"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            forceBuild: false,
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--force-build"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            forceBuild: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-force-build"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            forceBuild: false,
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noforceBuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforceBuild",
                                corrections: ["forceBuild"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noforcebuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforcebuild",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--no-forcebuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "no-forcebuild",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--no-force-build"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "no-force-build",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noforce-build"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforce-build",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--noforceBuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforceBuild",
                                corrections: ["forceBuild"],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--noforcebuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforcebuild",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-forcebuild"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "no-forcebuild",
                                corrections: [],
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--noforce-build"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noforce-build",
                                corrections: [],
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noForceBuild=no"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "InvalidNegatedFlagSyntaxError",
                            properties: {
                                externalFlagName: "noForceBuild",
                                valueText: "no",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noForceBuild=yes"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "InvalidNegatedFlagSyntaxError",
                            properties: {
                                externalFlagName: "noForceBuild",
                                valueText: "yes",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-force-build=no"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "InvalidNegatedFlagSyntaxError",
                            properties: {
                                externalFlagName: "no-force-build",
                                valueText: "no",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-force-build=yes"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "InvalidNegatedFlagSyntaxError",
                            properties: {
                                externalFlagName: "no-force-build",
                                valueText: "yes",
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
                expected: [{ kind: "argument:flag", completion: "--forceBuild", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--forceBuild", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--forceBuild", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--forceBuild", brief: "forceBuild" }],
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
                inputs: [],
                partial: "",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--force-build", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "-",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--force-build", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--force-build", brief: "forceBuild" }],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "--f",
                scannerConfig: {
                    ...defaultScannerConfig,
                    caseStyle: "allow-kebab-for-camel",
                },
                completionConfig: defaultCompletionConfig,
                expected: [{ kind: "argument:flag", completion: "--force-build", brief: "forceBuild" }],
            });
        });
    });

    describe("required with default", () => {
        type Positional = [];
        type Flags = {
            readonly bar: boolean;
            readonly baz: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                bar: { kind: "boolean", brief: "bar", default: false },
                baz: { kind: "boolean", brief: "baz", default: true },
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
                    arguments: [{ bar: false, baz: true }],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--bar"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: true,
                            baz: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--baz=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noBaz"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-baz"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: false,
                            baz: false,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--bar=false"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: false,
                            baz: true,
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--baz"],
                expected: {
                    success: true,
                    arguments: [
                        {
                            bar: false,
                            baz: true,
                        },
                    ],
                },
            });
        });
    });

    describe("with withNegated=false", () => {
        type Positional = [];
        type Flags = {
            readonly enableFeature: boolean;
        };

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {
                enableFeature: { kind: "boolean", brief: "enableFeature", default: true, withNegated: false },
            },
            positional: { kind: "tuple", parameters: [] },
        };

        it("parseArguments", async () => {
            // Flag should work normally
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--enableFeature"],
                expected: {
                    success: true,
                    arguments: [{ enableFeature: true }],
                },
            });

            // Negated flag should NOT work (flag not found error)
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["--noEnableFeature"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "noEnableFeature",
                                corrections: ["enableFeature"],
                            },
                        },
                    ],
                },
            });

            // Negated flag with kebab-case should also NOT work
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" },
                inputs: ["--no-enable-feature"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "FlagNotFoundError",
                            properties: {
                                input: "no-enable-feature",
                                corrections: ["enable-feature"],
                            },
                        },
                    ],
                },
            });

            // Default value should still be used when flag is not provided
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: [],
                expected: {
                    success: true,
                    arguments: [{ enableFeature: true }],
                },
            });
        });
    });
});
