// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import { buildChoiceParser, type CommandContext, numberParser, type TypedCommandParameters } from "../../../src";
import { defaultCompletionConfig, defaultScannerConfig, testArgumentScannerParse, testCompletions } from "../scanner";

describe("ArgumentScanner (positional)", () => {
    describe("tuple of choice and numeric parameters", () => {
        type Positional = ["add" | "remove", number];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        placeholder: "action",
                        brief: "action",
                        parse: buildChoiceParser(["add", "remove"]),
                    },
                    {
                        brief: "number",
                        parse: numberParser,
                    },
                ],
            },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["add", "100"],
                expected: {
                    success: true,
                    arguments: [{}, "add", 100],
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
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "action",
                            },
                        },
                        {
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "arg2",
                            },
                        },
                    ],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["remove"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "arg2",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["add", "100", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedPositionalError",
                            properties: {
                                expectedCount: 2,
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["ad"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "action",
                                input: "ad",
                                exception: new SyntaxError("ad is not one of (add|remove)"),
                            },
                        },
                        {
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "arg2",
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
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "a",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "1",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });
    });

    describe("tuple of optional parameter", () => {
        type Positional = [number?];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        placeholder: "userId",
                        brief: "userId",
                        parse: numberParser,
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
                    success: true,
                    arguments: [{}, void 0],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100"],
                expected: {
                    success: true,
                    arguments: [{}, 100],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedPositionalError",
                            properties: {
                                expectedCount: 1,
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "userId",
                                input: "INVALID",
                                exception: new Error("Cannot convert INVALID to a number"),
                            },
                        },
                    ],
                },
            });
        });
    });

    describe("tuple of parameter with default", () => {
        type Positional = [number];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        placeholder: "userId",
                        brief: "userId",
                        parse: numberParser,
                        default: "0",
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
                    success: true,
                    arguments: [{}, 0],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100"],
                expected: {
                    success: true,
                    arguments: [{}, 100],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedPositionalError",
                            properties: {
                                expectedCount: 1,
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["INVALID"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "userId",
                                input: "INVALID",
                                exception: new Error("Cannot convert INVALID to a number"),
                            },
                        },
                    ],
                },
            });
        });
    });

    describe("homogenous array of parameters", () => {
        type Positional = number[];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "array",
                parameter: {
                    brief: "number",
                    parse: numberParser,
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
                    arguments: [{}],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100"],
                expected: {
                    success: true,
                    arguments: [{}, 100],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: true,
                    arguments: [{}, 100, 200],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["zero"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "arg1",
                                input: "zero",
                                exception: new Error("Cannot convert zero to a number"),
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
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "a",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "1",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });
    });

    describe("homogenous array of parameters with minimum", () => {
        type Positional = number[];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "array",
                minimum: 2,
                parameter: {
                    brief: "number",
                    parse: numberParser,
                },
            },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: true,
                    arguments: [{}, 100, 200],
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
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "args",
                                limit: [2, 0],
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
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "args",
                                limit: [2, 1],
                            },
                        },
                    ],
                },
            });
        });
    });

    describe("homogenous array of parameters with minimum and placeholder", () => {
        type Positional = number[];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "array",
                minimum: 2,
                parameter: {
                    placeholder: "id",
                    brief: "id",
                    parse: numberParser,
                },
            },
        };

        it("parseArguments", async () => {
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: true,
                    arguments: [{}, 100, 200],
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
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "id",
                                limit: [2, 0],
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
                            type: "UnsatisfiedPositionalError",
                            properties: {
                                placeholder: "id",
                                limit: [2, 1],
                            },
                        },
                    ],
                },
            });
        });
    });

    describe("homogenous array of parameters with maximum", () => {
        type Positional = number[];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "array",
                maximum: 1,
                parameter: {
                    placeholder: "id",
                    brief: "id",
                    parse: numberParser,
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
                    arguments: [{}],
                },
            });
            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100"],
                expected: {
                    success: true,
                    arguments: [{}, 100],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["100", "200"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "UnexpectedPositionalError",
                            properties: {
                                expectedCount: 1,
                                input: "200",
                            },
                        },
                    ],
                },
            });

            await testArgumentScannerParse<Flags, Positional>({
                parameters,
                config: defaultScannerConfig,
                inputs: ["zero"],
                expected: {
                    success: false,
                    errors: [
                        {
                            type: "ArgumentParseError",
                            properties: {
                                externalFlagNameOrPlaceholder: "id",
                                input: "zero",
                                exception: new Error("Cannot convert zero to a number"),
                            },
                        },
                    ],
                },
            });
        });
    });

    describe("homogenous array of parameters with custom completions", () => {
        type Positional = number[];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "array",
                parameter: {
                    placeholder: "id",
                    brief: "id",
                    parse: numberParser,
                    proposeCompletions: (partial: string) => [`${partial}0`, `${partial}00`],
                },
                maximum: 3,
            },
        };

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "0", brief: "id" },
                    { kind: "argument:value", completion: "00", brief: "id" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "1",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "10", brief: "id" },
                    { kind: "argument:value", completion: "100", brief: "id" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["1"],
                partial: "2",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "20", brief: "id" },
                    { kind: "argument:value", completion: "200", brief: "id" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["1", "2", "3"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });
    });

    describe("tuple of parameters with custom completions", () => {
        type Positional = [number, number];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        placeholder: "id1",
                        brief: "id1",
                        parse: numberParser,
                        proposeCompletions: (partial: string) => [`${partial}0`, `${partial}00`],
                    },
                    {
                        placeholder: "id2",
                        brief: "id2",
                        parse: numberParser,
                        proposeCompletions: (partial: string) => [`${partial}9`, `${partial}99`],
                    },
                ],
            },
        };

        it("proposeCompletions", async () => {
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "0", brief: "id1" },
                    { kind: "argument:value", completion: "00", brief: "id1" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: [],
                partial: "1",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "10", brief: "id1" },
                    { kind: "argument:value", completion: "100", brief: "id1" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["1"],
                partial: "2",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [
                    { kind: "argument:value", completion: "29", brief: "id2" },
                    { kind: "argument:value", completion: "299", brief: "id2" },
                ],
            });
            await testCompletions<Flags, Positional>({
                parameters,
                inputs: ["1", "2"],
                partial: "",
                scannerConfig: defaultScannerConfig,
                completionConfig: defaultCompletionConfig,
                expected: [],
            });
        });
    });
});
