// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import assert from "assert";
import { expect, it } from "vitest";
import {
    ArgumentScannerError,
    type CommandContext,
    type CompletionConfiguration,
    type ScannerConfiguration,
    type TypedCommandParameters,
} from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { BaseArgs, PositionalParameters } from "../../src/parameter/positional/types";
// eslint-disable-next-line no-restricted-imports
import {
    type ArgumentCompletion,
    type ArgumentScannerErrorType,
    type ArgumentScannerParseResult,
    buildArgumentScanner,
    type ParsedArguments,
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

export function testCompletionError<FLAGS extends BaseFlags, ARGS extends BaseArgs>({
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
                loadCommandContext: async () => ({ process }),
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
        loadCommandContext: async () => ({ process }),
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

export async function testCompletions<FLAGS extends BaseFlags, ARGS extends BaseArgs>({
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

export const defaultScannerConfig: ScannerConfiguration = {
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

export const defaultCompletionConfig: CompletionConfiguration = {
    includeAliases: false,
    includeHiddenRoutes: false,
};
