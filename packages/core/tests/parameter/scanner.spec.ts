// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import assert from "assert";
import { describe, expect, it } from "vitest";
import {
    AliasNotFoundError,
    ArgumentParseError,
    ArgumentScannerError,
    buildChoiceParser,
    type CommandContext,
    type CompletionConfiguration,
    EnumValidationError,
    FlagNotFoundError,
    formatMessageForArgumentScannerError,
    InvalidNegatedFlagSyntaxError,
    numberParser,
    type ScannerConfiguration,
    type TypedCommandParameters,
    UnexpectedFlagError,
    UnexpectedPositionalError,
    UnsatisfiedFlagError,
    UnsatisfiedPositionalError,
} from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { BaseArgs, PositionalParameters } from "../../src/parameter/positional/types";
// eslint-disable-next-line no-restricted-imports
import {
    type ArgumentCompletion,
    type ArgumentScannerErrorType,
    type ArgumentScannerParseResult,
    buildArgumentScanner,
    type ExternalFlagName,
    type ParsedArguments,
    type Placeholder,
} from "../../src/parameter/scanner";
// eslint-disable-next-line no-restricted-imports
import type { BaseFlags } from "../../src/parameter/types";
import { buildFakeApplicationText } from "../fakes/config";

function formatPositionalParameters(positional: PositionalParameters): string {
    if (positional.kind === "array") {
        return `${positional.parameter.placeholder ?? "args"}...`;
    }
    return positional.parameters.map((def, i) => def.placeholder ?? `arg${i + 1}`).join(", ");
}

type ExpectedArgumentScannerError = {
    [K in keyof ArgumentScannerErrorType]: {
        readonly type: K;
        readonly properties: Omit<ArgumentScannerErrorType[K], keyof Error>;
    };
}[keyof ArgumentScannerErrorType];

function confirmScannerErrorExpectation(error: ArgumentScannerError, expectedError: ExpectedArgumentScannerError) {
    expect(error.constructor.name).to.equal(
        expectedError.type,
        `Expected ${error.constructor.name} to be instance of ${expectedError.type}`,
    );
    for (const [prop, value] of Object.entries(expectedError.properties)) {
        if (value instanceof Error) {
            const actual = (error as unknown as Record<string, Error>)[prop];
            expect(actual).to.be.instanceOf(value.constructor);
            expect(actual).to.have.property("message", value.message);
        } else {
            expect(error).to.have.deep.property(prop, value);
        }
    }
}

interface CompletionErrorTest<FLAGS extends BaseFlags, ARGS extends BaseArgs> {
    readonly parameters: TypedCommandParameters<FLAGS, ARGS, CommandContext>;
    readonly inputs: string[];
    readonly partial: string;
    readonly scannerConfig: ScannerConfiguration;
    readonly completionConfig: CompletionConfiguration;
    readonly expected: ExpectedArgumentScannerError;
}

function testCompletionError<FLAGS extends BaseFlags, ARGS extends BaseArgs>({
    parameters,
    inputs,
    partial,
    scannerConfig,
    completionConfig,
    expected,
}: CompletionErrorTest<FLAGS, ARGS>) {
    const flags = Object.keys(parameters.flags ?? {}).join(", ");
    const positionalParameters = (parameters.positional ?? { kind: "tuple", parameters: [] }) as PositionalParameters;
    const positional = formatPositionalParameters(positionalParameters);
    let parameterConfig = "";
    if (flags.length > 0) {
        parameterConfig += `{ ${flags} }`;
    }
    if (positional.length > 0) {
        parameterConfig += `[${positional}]`;
    }
    if (parameterConfig.length === 0) {
        parameterConfig = "<none>";
    }
    const args = [...inputs, partial];
    it(`fails with ${expected.type} on propose for ["${args.join(
        '", "',
    )}"] with config ${parameterConfig} + ${JSON.stringify(scannerConfig)} + ${JSON.stringify(
        completionConfig,
    )}`, async () => {
        try {
            const text = buildFakeApplicationText();
            const scanner = buildArgumentScanner(parameters, scannerConfig);
            for (const arg of inputs) {
                scanner.next(arg);
            }
            await scanner.proposeCompletions({
                partial,
                completionConfig,
                text,
                context: { process },
                includeVersionFlag: false,
            });
        } catch (exc) {
            assert(exc instanceof ArgumentScannerError);
            expect(exc.constructor.name).to.equal(
                expected.type,
                `Expected ${exc.constructor.name} to be instance of ${expected.type}`,
            );
            for (const [prop, value] of Object.entries(expected.properties)) {
                if (value instanceof Error) {
                    const actual = (exc as unknown as Record<string, Error>)[prop];
                    expect(actual).to.be.instanceOf(value.constructor);
                    expect(actual).to.have.property("message", value.message);
                } else {
                    expect(exc).to.have.deep.property(prop, value);
                }
            }
            return;
        }
        throw new Error(`Expected next/proposeCompletions to throw with ${expected.type}`);
    });
}

async function parseInputs<FLAGS extends BaseFlags, ARGS extends BaseArgs>(
    parameters: TypedCommandParameters<FLAGS, ARGS, CommandContext>,
    config: ScannerConfiguration,
    inputs: string[],
): Promise<ArgumentScannerParseResult<FLAGS, ARGS>> {
    try {
        const scanner = buildArgumentScanner(parameters, config);
        for (const arg of inputs) {
            scanner.next(arg);
        }
        return await scanner.parseArguments({ process });
    } catch (exc) {
        if (exc instanceof ArgumentScannerError) {
            return { success: false, errors: [exc] };
        }
        throw exc;
    }
}

export type ArgumentScannerParseResultExpectation<FLAGS extends BaseFlags, ARGS extends BaseArgs> =
    | { success: true; arguments: ParsedArguments<FLAGS, ARGS> }
    | { success: false; errors: readonly ExpectedArgumentScannerError[] };

export interface ArgumentScannerParseTestArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs> {
    readonly parameters: TypedCommandParameters<FLAGS, ARGS, CommandContext>;
    readonly config: ScannerConfiguration;
    readonly inputs: string[];
    readonly expected: ArgumentScannerParseResultExpectation<FLAGS, ARGS>;
}

export async function testArgumentScannerParse<FLAGS extends BaseFlags, ARGS extends BaseArgs>({
    parameters,
    config,
    inputs,
    expected,
}: ArgumentScannerParseTestArguments<FLAGS, ARGS>): Promise<void> {
    const actual = await parseInputs(parameters, config, inputs);
    if (expected.success) {
        if (!actual.success) {
            throw new Error(
                `Expected argument scanner to parse [${inputs.join(",")}], but it failed with ${actual.errors
                    .map((error) => error.constructor.name)
                    .join(",")}`,
            );
        }
        const [actualFlags, actualPositionals] = actual.arguments;
        const [expectedFlags, expectedPositionals] = expected.arguments;
        expect(actualFlags).to.deep.equal(expectedFlags);
        expect(actualPositionals).to.deep.equal(expectedPositionals);
    } else {
        if (actual.success) {
            throw new Error(
                `Expected argument scanner to fail parsing [${inputs.join(",")}], but it succeeded as ${JSON.stringify(
                    actual.arguments,
                )}`,
            );
        }
        expect(actual.errors.map((error) => error.constructor.name)).to.deep.equal(
            expected.errors.map((error) => error.type),
        );
        for (let i = 0; i < expected.errors.length; ++i) {
            confirmScannerErrorExpectation(actual.errors[i]!, expected.errors[i]!);
        }
    }
}

async function proposeCompletionsForPartial<FLAGS extends BaseFlags, ARGS extends BaseArgs>(
    parameters: TypedCommandParameters<FLAGS, ARGS, CommandContext>,
    scannerConfig: ScannerConfiguration,
    completionConfig: CompletionConfiguration,
    inputs: string[],
    partial: string,
) {
    const text = buildFakeApplicationText();
    const scanner = buildArgumentScanner(parameters, scannerConfig);
    for (const arg of inputs) {
        scanner.next(arg);
    }
    return scanner.proposeCompletions({
        partial,
        completionConfig,
        text,
        context: { process },
        includeVersionFlag: false,
    });
}

interface ArgumentScannerCompletionTestArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs> {
    readonly parameters: TypedCommandParameters<FLAGS, ARGS, CommandContext>;
    readonly inputs: string[];
    readonly partial: string;
    readonly scannerConfig: ScannerConfiguration;
    readonly completionConfig: CompletionConfiguration;
    readonly expected: readonly ArgumentCompletion[];
}

async function testCompletions<FLAGS extends BaseFlags, ARGS extends BaseArgs>({
    parameters,
    inputs,
    partial,
    scannerConfig,
    completionConfig,
    expected,
}: ArgumentScannerCompletionTestArguments<FLAGS, ARGS>): Promise<void> {
    const completions = await proposeCompletionsForPartial<FLAGS, ARGS>(
        parameters,
        scannerConfig,
        completionConfig,
        inputs,
        partial,
    );
    expect(completions).to.have.deep.members(expected);
}

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

const defaultCompletionConfig: CompletionConfiguration = {
    includeAliases: false,
    includeHiddenRoutes: false,
};

describe("ArgumentScanner", () => {
    describe("positional", () => {
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

    describe("flags", () => {
        describe("required boolean flag", () => {
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

        describe("multiple required boolean flags with aliases", () => {
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

        describe("required boolean flag with alphanumeric name", () => {
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

        describe("optional boolean flag", () => {
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

        describe("required boolean flag with default", () => {
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

        describe("required parsed flag", () => {
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

        describe("required parsed flag (string)", () => {
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

        describe("optional parsed flag", () => {
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

        describe("optional parsed flags (string)", () => {
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

        describe("optional enum flag", () => {
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

        describe("required enum flag", () => {
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

        describe("optional variadic enum flag", () => {
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

        describe("required variadic enum flag", () => {
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

        describe("required variadic (separator) enum flag", () => {
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

        describe("optional variadic enum flag with default", () => {
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

        describe("required variadic enum flag with default", () => {
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

        describe("required variadic enum flag with invalid default", () => {
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

        describe("optional variadic parsed flag with default", () => {
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

        describe("required variadic parsed flag with default", () => {
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

        describe("parsed (string) flag with default", () => {
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

        describe("parsed flag with default", () => {
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

        describe("optional parsed flag", () => {
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

        describe("optional variadic parsed flags", () => {
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

        describe("required variadic parsed flags", () => {
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

        describe("required variadic (separator) parsed flags", () => {
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

        describe("optional variadic parsed flags", () => {
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

        describe("required array parsed flags", () => {
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

        describe("parsed flags with custom completions", () => {
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
    });

    describe("mixed", () => {
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
