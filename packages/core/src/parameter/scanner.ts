// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CompletionConfiguration, ScannerCaseStyle, ScannerConfiguration } from "../config";
import type { CommandContext } from "../context";
import type { RouteMap } from "../routing/route-map/types";
import type { ApplicationText } from "../text";
import { convertCamelCaseToKebabCase, convertKebabCaseToCamelCase } from "../util/case-style";
import { filterClosestAlternatives } from "../util/distance";
import { InternalError } from "../util/error";
import { joinWithGrammar } from "../util/formatting";
import { allSettledOrElse, type PromiseSettledOrElseResult } from "../util/promise";
import type {
    BaseEnumFlagParameter,
    BaseParsedFlagParameter,
    BooleanFlagParameter,
    CounterFlagParameter,
    FlagParameter,
    FlagParameters,
} from "./flag/types";
import { looseBooleanParser } from "./parser/boolean";
import { numberParser } from "./parser/number";
import type { BaseArgs, PositionalParameter } from "./positional/types";
import type {
    Aliases,
    AvailableAlias,
    BaseFlags,
    CommandParameters,
    ParsedParameter,
    TypedCommandParameters,
} from "./types";

/**
 * Abstract class that all internal argument scanner errors extend from.
 */
export abstract class ArgumentScannerError extends InternalError {
    private readonly _brand: undefined;
}

export interface ArgumentScannerErrorType {
    readonly AliasNotFoundError: AliasNotFoundError;
    readonly ArgumentParseError: ArgumentParseError;
    readonly EnumValidationError: EnumValidationError;
    readonly FlagNotFoundError: FlagNotFoundError;
    readonly InvalidNegatedFlagSyntaxError: InvalidNegatedFlagSyntaxError;
    readonly UnexpectedFlagError: UnexpectedFlagError;
    readonly UnexpectedPositionalError: UnexpectedPositionalError;
    readonly UnsatisfiedFlagError: UnsatisfiedFlagError;
    readonly UnsatisfiedPositionalError: UnsatisfiedPositionalError;
}

type ArgumentScannerErrorFormatter = {
    readonly [T in keyof ArgumentScannerErrorType]: (error: ArgumentScannerErrorType[T]) => string;
};

/**
 * Utility method for customizing message of argument scanner error
 * @param error Error thrown by argument scanner
 * @param formatter For all keys specified, controls message formatting for that specific subtype of error
 */
export function formatMessageForArgumentScannerError(
    error: ArgumentScannerError,
    formatter: Partial<ArgumentScannerErrorFormatter>,
): string {
    const errorType = error.constructor.name as keyof ArgumentScannerErrorType;
    const formatError = formatter[errorType] as ((error: ArgumentScannerError) => string) | undefined;
    if (formatError) {
        return formatError(error);
    }
    return error.message;
}

function resolveAliases<CONTEXT extends CommandContext>(
    flags: FlagParameters,
    aliases: Aliases<string>,
    scannerCaseStyle: ScannerCaseStyle,
): Partial<Record<AvailableAlias, NamedFlag<CONTEXT, FlagParameter<CONTEXT>>>> {
    return Object.fromEntries<NamedFlag<CONTEXT, FlagParameter<CONTEXT>>>(
        Object.entries(aliases).map(([alias, internalFlagName_]) => {
            const internalFlagName = internalFlagName_ as InternalFlagName;
            const flag = flags[internalFlagName];
            if (!flag) {
                const externalFlagName = asExternal(internalFlagName, scannerCaseStyle);
                throw new FlagNotFoundError(externalFlagName, [], alias);
            }
            return [alias as AvailableAlias, [internalFlagName, flag]] as const;
        }),
    );
}

/**
 * Thrown when input suggests an flag, but no flag with that name was found.
 */
export class FlagNotFoundError extends ArgumentScannerError {
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    /**
     * Set of proposed suggestions that are similar to the input.
     */
    readonly corrections: readonly string[];
    /**
     * Set if error was caused indirectly by an alias.
     * This indicates that something is wrong with the command configuration itself.
     */
    readonly aliasName?: string;
    constructor(input: string, corrections: readonly string[], aliasName?: string) {
        let message = `No flag registered for --${input}`;
        if (aliasName) {
            message += ` (aliased from -${aliasName})`;
        } else if (corrections.length > 0) {
            const formattedCorrections = joinWithGrammar(
                corrections.map((correction) => `--${correction}`),
                {
                    kind: "conjunctive",
                    conjunction: "or",
                    serialComma: true,
                },
            );
            message += `, did you mean ${formattedCorrections}?`;
        }
        super(message);
        this.input = input;
        this.corrections = corrections;
        this.aliasName = aliasName;
    }
}

/**
 * Thrown when input suggests an alias, but no alias with that letter was found.
 */
export class AliasNotFoundError extends ArgumentScannerError {
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    constructor(input: string) {
        super(`No alias registered for -${input}`);
        this.input = input;
    }
}

export type Placeholder = string & { readonly __Placeholder: unique symbol };

function getPlaceholder(param: PositionalParameter, index?: number): Placeholder {
    if (param.placeholder) {
        return param.placeholder as Placeholder;
    }
    return (typeof index === "number" ? `arg${index}` : "args") as Placeholder;
}

/**
 * @internal
 */
export type InternalFlagName = string & { readonly __InternalFlagName: unique symbol };

export type ExternalFlagName = string & { readonly __ExternalFlagName: unique symbol };

function asExternal(internal: InternalFlagName, scannerCaseStyle: ScannerCaseStyle): ExternalFlagName {
    return (
        scannerCaseStyle === "allow-kebab-for-camel" ? convertCamelCaseToKebabCase(internal) : internal
    ) as ExternalFlagName;
}

/**
 * Thrown when underlying parameter parser throws an exception parsing some input.
 */
export class ArgumentParseError extends ArgumentScannerError {
    /**
     * External name of flag or placeholder for positional argument that was parsing this input.
     */
    readonly externalFlagNameOrPlaceholder: string;
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    /**
     * Raw exception thrown from parse function.
     */
    readonly exception: unknown;
    constructor(externalFlagNameOrPlaceholder: ExternalFlagName | Placeholder, input: string, exception: unknown) {
        super(
            `Failed to parse "${input}" for ${externalFlagNameOrPlaceholder}: ${
                exception instanceof Error ? exception.message : String(exception)
            }`,
        );
        this.externalFlagNameOrPlaceholder = externalFlagNameOrPlaceholder;
        this.input = input;
        this.exception = exception;
    }
}

function parseInput<T, CONTEXT extends CommandContext>(
    externalFlagNameOrPlaceholder: ExternalFlagName | Placeholder,
    parameter: ParsedParameter<T, CONTEXT>,
    input: string,
    context: CONTEXT,
): T | Promise<T> {
    try {
        return parameter.parse.call(context, input);
    } catch (exc) {
        throw new ArgumentParseError(externalFlagNameOrPlaceholder, input, exc);
    }
}

/**
 * Thrown when input fails to match the given values for an enum flag.
 */
export class EnumValidationError extends ArgumentScannerError {
    /**
     * External name of flag that was parsing this input.
     */
    readonly externalFlagName: string;
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    /**
     * All possible enum values.
     */
    readonly values: readonly string[];
    constructor(
        externalFlagName: ExternalFlagName,
        input: string,
        values: readonly string[],
        corrections: readonly string[],
    ) {
        let message = `Expected "${input}" to be one of (${values.join("|")})`;
        if (corrections.length > 0) {
            const formattedCorrections = joinWithGrammar(
                corrections.map((str) => `"${str}"`),
                {
                    kind: "conjunctive",
                    conjunction: "or",
                    serialComma: true,
                },
            );
            message += `, did you mean ${formattedCorrections}?`;
        }
        super(message);
        this.externalFlagName = externalFlagName;
        this.input = input;
        this.values = values;
    }
}

/**
 * Thrown when flag was expecting input that was not provided.
 */
export class UnsatisfiedFlagError extends ArgumentScannerError {
    /**
     * External name of flag that was active when this error was thrown.
     */
    readonly externalFlagName: string;
    /**
     * External name of flag that interrupted the original flag.
     */
    readonly nextFlagName?: string;
    constructor(externalFlagName: ExternalFlagName, nextFlagName?: ExternalFlagName) {
        let message = `Expected input for flag --${externalFlagName}`;
        if (nextFlagName) {
            message += ` but encountered --${nextFlagName} instead`;
        }
        super(message);
        this.externalFlagName = externalFlagName;
        this.nextFlagName = nextFlagName;
    }
}

/**
 * Thrown when too many positional arguments were encountered.
 */
export class UnexpectedPositionalError extends ArgumentScannerError {
    /**
     * Expected (maximum) count of positional arguments.
     */
    readonly expectedCount: number;
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    constructor(expectedCount: number, input: string) {
        super(`Too many arguments, expected ${expectedCount} but encountered "${input}"`);
        this.expectedCount = expectedCount;
        this.input = input;
    }
}

/**
 * Thrown when positional parameter was expecting input that was not provided.
 */
export class UnsatisfiedPositionalError extends ArgumentScannerError {
    /**
     * Placeholder for positional argument that was active when this error was thrown.
     */
    readonly placeholder: string;
    /**
     * If specified, indicates the minimum number of arguments that are expected and the last argument count.
     */
    readonly limit?: [minimum: number, count: number];
    constructor(placeholder: Placeholder, limit?: [minimum: number, count: number]) {
        let message: string;
        if (limit) {
            message = `Expected at least ${limit[0]} argument(s) for ${placeholder}`;
            if (limit[1] === 0) {
                message += " but found none";
            } else {
                message += ` but only found ${limit[1]}`;
            }
        } else {
            message = `Expected argument for ${placeholder}`;
        }
        super(message);
        this.placeholder = placeholder;
        this.limit = limit;
    }
}

type NamedFlag<CONTEXT extends CommandContext, T extends FlagParameter<CONTEXT>> = readonly [
    name: InternalFlagName,
    flag: T,
];
type NamedFlagWithNegation<CONTEXT extends CommandContext> =
    | { readonly namedFlag: NamedFlag<CONTEXT, FlagParameter<CONTEXT>>; readonly negated?: false }
    | { readonly namedFlag: NamedFlag<CONTEXT, BooleanFlagParameter>; readonly negated: true };

type FlagParserExpectingInput<CONTEXT extends CommandContext> =
    | BaseEnumFlagParameter<string>
    | BaseParsedFlagParameter<unknown, CONTEXT>;

type NamedFlagExpectingInput<CONTEXT extends CommandContext> = NamedFlag<CONTEXT, FlagParserExpectingInput<CONTEXT>>;

function undoNegation<T extends string>(flagName: T): T | undefined {
    if (flagName.startsWith("no") && flagName.length > 2) {
        if (flagName[2] === "-") {
            return flagName.slice(4) as T;
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstChar = flagName[2]!;
        const firstUpper = firstChar.toUpperCase();
        if (firstChar !== firstUpper) {
            return;
        }
        const firstLower = firstChar.toLowerCase();
        return (firstLower + flagName.slice(3)) as T;
    }
}

function findInternalFlagMatch<CONTEXT extends CommandContext>(
    externalFlagName: ExternalFlagName,
    flags: Readonly<Record<string, FlagParameter<CONTEXT>>>,
    config: ScannerConfiguration,
): NamedFlagWithNegation<CONTEXT> {
    const internalFlagName = externalFlagName as string as InternalFlagName;
    let flag = flags[internalFlagName];
    if (!flag) {
        const internalWithoutNegation = undoNegation(internalFlagName);
        if (internalWithoutNegation) {
            flag = flags[internalWithoutNegation];
            if (flag && flag.kind == "boolean") {
                return { namedFlag: [internalWithoutNegation, flag], negated: true };
            }
        }
    }
    const camelCaseFlagName = convertKebabCaseToCamelCase(externalFlagName) as InternalFlagName;
    if (config.caseStyle === "allow-kebab-for-camel" && !flag) {
        flag = flags[camelCaseFlagName];
        if (flag) {
            return { namedFlag: [camelCaseFlagName, flag] };
        }
        const camelCaseWithoutNegation = undoNegation(camelCaseFlagName);
        if (camelCaseWithoutNegation) {
            flag = flags[camelCaseWithoutNegation];
            if (flag && flag.kind == "boolean") {
                return { namedFlag: [camelCaseWithoutNegation, flag], negated: true };
            }
        }
    }
    if (!flag) {
        if (camelCaseFlagName in flags) {
            throw new FlagNotFoundError(externalFlagName, [camelCaseFlagName]);
        }
        const kebabCaseFlagName = convertCamelCaseToKebabCase(externalFlagName);
        if (kebabCaseFlagName in flags) {
            throw new FlagNotFoundError(externalFlagName, [kebabCaseFlagName]);
        }
        const corrections = filterClosestAlternatives(internalFlagName, Object.keys(flags), config.distanceOptions);
        throw new FlagNotFoundError(externalFlagName, corrections);
    }
    return { namedFlag: [internalFlagName, flag] };
}

type NiladicFlagParameter = BooleanFlagParameter | CounterFlagParameter;

function isNiladic<CONTEXT extends CommandContext>(
    namedFlagWithNegation: NamedFlagWithNegation<CONTEXT>,
): namedFlagWithNegation is NamedFlagWithNegation<CONTEXT> & {
    readonly namedFlag: NamedFlag<CONTEXT, NiladicFlagParameter>;
} {
    if (
        namedFlagWithNegation.namedFlag[1].kind === "boolean" ||
        namedFlagWithNegation.namedFlag[1].kind === "counter"
    ) {
        return true;
    }
    return false;
}

const FLAG_SHORTHAND_PATTERN = /^-([a-z]+)$/i;
const FLAG_NAME_PATTERN = /^--([a-z][a-z-]+)$/i;

function findFlagsByArgument<CONTEXT extends CommandContext>(
    arg: string,
    flags: Readonly<Record<string, FlagParameter<CONTEXT>>>,
    resolvedAliases: Partial<Record<AvailableAlias, NamedFlag<CONTEXT, FlagParameter<CONTEXT>>>>,
    config: ScannerConfiguration,
): readonly NamedFlagWithNegation<CONTEXT>[] {
    const shorthandMatch = FLAG_SHORTHAND_PATTERN.exec(arg);
    if (shorthandMatch) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const batch = shorthandMatch[1]!;
        return Array.from(batch).map((alias) => {
            const aliasName = alias as AvailableAlias;
            const namedFlag = resolvedAliases[aliasName];
            if (!namedFlag) {
                throw new AliasNotFoundError(aliasName);
            }
            return { namedFlag };
        });
    }

    const flagNameMatch = FLAG_NAME_PATTERN.exec(arg);
    if (flagNameMatch) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const externalFlagName = flagNameMatch[1]! as ExternalFlagName;
        return [findInternalFlagMatch(externalFlagName, flags, config)];
    }

    return [];
}

const FLAG_NAME_VALUE_PATTERN = /^--([a-z][a-z-.\d_]+)=(.+)$/i;
const ALIAS_VALUE_PATTERN = /^-([a-z])=(.+)$/i;

/**
 * Thrown when a value is provided for a negated flag.
 */
export class InvalidNegatedFlagSyntaxError extends ArgumentScannerError {
    /**
     * External name of flag that was active when this error was thrown.
     */
    readonly externalFlagName: string;
    /**
     * Input text equivalent to right hand side of input
     */
    readonly valueText: string;
    constructor(externalFlagName: ExternalFlagName, valueText: string) {
        super(`Cannot negate flag --${externalFlagName} and pass "${valueText}" as value`);
        this.externalFlagName = externalFlagName;
        this.valueText = valueText;
    }
}

function findFlagByArgumentWithInput<CONTEXT extends CommandContext>(
    arg: string,
    flags: Readonly<Record<string, FlagParameter<CONTEXT>>>,
    resolvedAliases: Partial<Record<AvailableAlias, NamedFlag<CONTEXT, FlagParameter<CONTEXT>>>>,
    config: ScannerConfiguration,
): readonly [flag: NamedFlag<CONTEXT, FlagParameter<CONTEXT>>, input: string] | undefined {
    const flagsNameMatch = FLAG_NAME_VALUE_PATTERN.exec(arg);
    if (flagsNameMatch) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const externalFlagName = flagsNameMatch[1]! as ExternalFlagName;
        const { namedFlag: flagMatch, negated } = findInternalFlagMatch(externalFlagName, flags, config);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const valueText = flagsNameMatch[2]!;
        if (negated) {
            throw new InvalidNegatedFlagSyntaxError(externalFlagName, valueText);
        }
        return [flagMatch, valueText];
    }
    const aliasValueMatch = ALIAS_VALUE_PATTERN.exec(arg);
    if (aliasValueMatch) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const aliasName = aliasValueMatch[1]! as AvailableAlias;
        const namedFlag = resolvedAliases[aliasName];
        if (!namedFlag) {
            throw new AliasNotFoundError(aliasName);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const valueText = aliasValueMatch[2]!;
        return [namedFlag, valueText];
    }
}

async function parseInputsForFlag<CONTEXT extends CommandContext>(
    externalFlagName: ExternalFlagName,
    flag: FlagParameter<CONTEXT>,
    inputs: ArgumentInputs | undefined,
    config: ScannerConfiguration,
    context: CONTEXT,
): Promise<unknown> {
    if (!inputs) {
        if ("default" in flag && typeof flag.default !== "undefined") {
            if (flag.kind === "boolean") {
                return flag.default;
            }
            if (flag.kind === "enum") {
                return flag.default;
            }
            return parseInput(externalFlagName, flag, flag.default, context);
        }
        if (flag.optional) {
            return;
        }
        if (flag.kind === "boolean") {
            return false;
        } else if (flag.kind === "counter") {
            return 0;
        }
        throw new UnsatisfiedFlagError(externalFlagName);
    }
    if (flag.kind === "counter") {
        return inputs.reduce((total, input) => {
            try {
                return total + numberParser.call(context, input);
            } catch (exc) {
                throw new ArgumentParseError(externalFlagName, input, exc);
            }
        }, 0);
    }
    if ("variadic" in flag && flag.variadic) {
        if (flag.kind === "enum") {
            for (const input of inputs) {
                if (!flag.values.includes(input)) {
                    const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
                    throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
                }
            }
            return inputs;
        }
        return Promise.all(inputs.map((input) => parseInput(externalFlagName, flag, input, context)));
    }
    const input = inputs[0];
    if (flag.kind === "boolean") {
        try {
            return looseBooleanParser.call(context, input);
        } catch (exc) {
            throw new ArgumentParseError(externalFlagName, input, exc);
        }
    }
    if (flag.kind === "enum") {
        if (!flag.values.includes(input)) {
            const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
            throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
        }
        return input;
    }
    return parseInput(externalFlagName, flag, input, context);
}

/**
 * @internal
 */
export type ParsedArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs> = readonly [flags: FLAGS, ...args: ARGS];

export type ArgumentScannerParseResult<FLAGS extends BaseFlags, ARGS extends BaseArgs> =
    | { readonly success: true; readonly arguments: ParsedArguments<FLAGS, ARGS> }
    | { readonly success: false; readonly errors: readonly ArgumentScannerError[] };

export interface ArgumentScannerCompletionArguments<CONTEXT extends CommandContext> {
    readonly partial: string;
    readonly completionConfig: CompletionConfiguration;
    readonly text: ApplicationText;
    readonly context: CONTEXT;
    readonly includeVersionFlag: boolean;
}

export interface ArgumentCompletion {
    readonly kind: "argument:flag" | "argument:value";
    readonly completion: string;
    readonly brief: string;
}

/**
 * @internal
 */
export interface ArgumentScanner<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> {
    readonly next: (input: string) => void;
    readonly parseArguments: (context: CONTEXT) => Promise<ArgumentScannerParseResult<FLAGS, ARGS>>;
    readonly proposeCompletions: (
        args: ArgumentScannerCompletionArguments<CONTEXT>,
    ) => Promise<readonly ArgumentCompletion[]>;
}

/**
 * Thrown when single-valued flag encounters more than one value.
 */
export class UnexpectedFlagError extends ArgumentScannerError {
    /**
     * External name of flag that was parsing this input.
     */
    readonly externalFlagName: string;
    /**
     * Command line input that was previously encountered by this flag.
     */
    readonly previousInput: string;
    /**
     * Command line input that triggered this error.
     */
    readonly input: string;
    constructor(externalFlagName: ExternalFlagName, previousInput: string, input: string) {
        super(`Too many arguments for --${externalFlagName}, encountered "${input}" after "${previousInput}"`);
        this.externalFlagName = externalFlagName;
        this.previousInput = previousInput;
        this.input = input;
    }
}

type ArgumentInputs = readonly [string, ...string[]];

function isVariadicFlag<CONTEXT extends CommandContext>(flag: FlagParameter<CONTEXT>): boolean {
    if (flag.kind === "counter") {
        return true;
    }
    if ("variadic" in flag) {
        return Boolean(flag.variadic);
    }
    return false;
}

function storeInput<CONTEXT extends CommandContext>(
    flagInputs: Map<InternalFlagName, ArgumentInputs>,
    scannerCaseStyle: ScannerCaseStyle,
    [internalFlagName, flag]: NamedFlag<CONTEXT, FlagParameter<CONTEXT>>,
    input: string,
) {
    const inputs = flagInputs.get(internalFlagName) ?? [];
    if (inputs.length > 0 && !isVariadicFlag(flag)) {
        const externalFlagName = asExternal(internalFlagName, scannerCaseStyle);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        throw new UnexpectedFlagError(externalFlagName, inputs[0]!, input);
    }
    if ("variadic" in flag && typeof flag.variadic === "string") {
        const multipleInputs = input.split(flag.variadic) as unknown as ArgumentInputs;
        flagInputs.set(internalFlagName, [...inputs, ...multipleInputs]);
    } else {
        flagInputs.set(internalFlagName, [...inputs, input]);
    }
}

function isFlagSatisfiedByInputs(
    flags: FlagParameters,
    flagInputs: ReadonlyMap<InternalFlagName, readonly string[]>,
    key: InternalFlagName,
): boolean {
    const inputs = flagInputs.get(key);
    if (inputs) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const flag = flags[key]!;
        if (isVariadicFlag(flag)) {
            return false;
        }
        return true;
    }
    return false;
}

/**
 * @internal
 */
export function buildArgumentScanner<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext>(
    parameters: TypedCommandParameters<FLAGS, ARGS, CONTEXT> | CommandParameters,
    config: ScannerConfiguration,
): ArgumentScanner<FLAGS, ARGS, CONTEXT>;
export function buildArgumentScanner<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext>(
    parameters: CommandParameters,
    config: ScannerConfiguration,
): ArgumentScanner<FLAGS, ARGS, CONTEXT> {
    const { flags = {}, aliases = {}, positional = { kind: "tuple", parameters: [] } } = parameters;
    const resolvedAliases = resolveAliases(flags, aliases, config.caseStyle);

    const positionalInputs: string[] = [];
    const flagInputs = new Map<InternalFlagName, ArgumentInputs>();

    let positionalIndex = 0;
    let activeFlag: NamedFlagExpectingInput<CONTEXT> | undefined;
    let treatInputsAsArguments = false;

    return {
        next: (input: string) => {
            if (!treatInputsAsArguments && config.allowArgumentEscapeSequence && input === "--") {
                if (activeFlag) {
                    if (activeFlag[1].kind === "parsed" && activeFlag[1].inferEmpty) {
                        storeInput(flagInputs, config.caseStyle, activeFlag, "");
                        activeFlag = void 0;
                    } else {
                        const externalFlagName = asExternal(activeFlag[0], config.caseStyle);
                        throw new UnsatisfiedFlagError(externalFlagName);
                    }
                }
                treatInputsAsArguments = true;
                return;
            }

            if (!treatInputsAsArguments) {
                const flagInput = findFlagByArgumentWithInput(input, flags, resolvedAliases, config);
                if (flagInput) {
                    if (activeFlag) {
                        if (activeFlag[1].kind === "parsed" && activeFlag[1].inferEmpty) {
                            storeInput(flagInputs, config.caseStyle, activeFlag, "");
                            activeFlag = void 0;
                        } else {
                            const externalFlagName = asExternal(activeFlag[0], config.caseStyle);
                            const nextExternalFlagName = asExternal(flagInput[0][0], config.caseStyle);
                            throw new UnsatisfiedFlagError(externalFlagName, nextExternalFlagName);
                        }
                    }
                    storeInput(flagInputs, config.caseStyle, ...flagInput);
                    return;
                }

                const nextFlags = findFlagsByArgument(input, flags, resolvedAliases, config);
                if (nextFlags.length > 0) {
                    if (activeFlag) {
                        if (activeFlag[1].kind === "parsed" && activeFlag[1].inferEmpty) {
                            storeInput(flagInputs, config.caseStyle, activeFlag, "");
                            activeFlag = void 0;
                        } else {
                            const externalFlagName = asExternal(activeFlag[0], config.caseStyle);
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            const nextFlagName = asExternal(nextFlags[0]!.namedFlag[0], config.caseStyle);
                            throw new UnsatisfiedFlagError(externalFlagName, nextFlagName);
                        }
                    }
                    if (nextFlags.every(isNiladic)) {
                        for (const nextFlag of nextFlags) {
                            if (nextFlag.namedFlag[1].kind === "boolean") {
                                storeInput(
                                    flagInputs,
                                    config.caseStyle,
                                    nextFlag.namedFlag,
                                    nextFlag.negated ? "false" : "true",
                                );
                            } else {
                                storeInput(flagInputs, config.caseStyle, nextFlag.namedFlag, "1");
                            }
                        }
                    } else if (nextFlags.length > 1) {
                        const nextFlagExpectingArg = nextFlags.find((nextFlag) => !isNiladic(nextFlag));
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const externalFlagName = asExternal(nextFlagExpectingArg!.namedFlag[0], config.caseStyle);
                        throw new UnsatisfiedFlagError(externalFlagName);
                    } else {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        activeFlag = nextFlags[0]!.namedFlag as NamedFlag<CONTEXT, FlagParserExpectingInput<CONTEXT>>;
                    }
                    return;
                }
            }

            if (activeFlag) {
                storeInput(flagInputs, config.caseStyle, activeFlag, input);
                activeFlag = void 0;
            } else {
                if (positional.kind === "tuple") {
                    if (positionalIndex >= positional.parameters.length) {
                        throw new UnexpectedPositionalError(positional.parameters.length, input);
                    }
                } else {
                    if (typeof positional.maximum === "number" && positionalIndex >= positional.maximum) {
                        throw new UnexpectedPositionalError(positional.maximum, input);
                    }
                }
                positionalInputs[positionalIndex] = input;
                ++positionalIndex;
            }
        },
        parseArguments: async (context) => {
            const errors: ArgumentScannerError[] = [];

            let positionalValues_p: Promise<PromiseSettledOrElseResult<ARGS>>;
            if (positional.kind === "array") {
                if (typeof positional.minimum === "number" && positionalIndex < positional.minimum) {
                    errors.push(
                        new UnsatisfiedPositionalError(getPlaceholder(positional.parameter), [
                            positional.minimum,
                            positionalIndex,
                        ]),
                    );
                }
                positionalValues_p = allSettledOrElse(
                    positionalInputs.map(async (input, i) => {
                        const placeholder = getPlaceholder(positional.parameter, i + 1);
                        return parseInput(placeholder, positional.parameter, input, context);
                    }),
                ) as Promise<PromiseSettledOrElseResult<ARGS>>;
            } else {
                positionalValues_p = allSettledOrElse(
                    positional.parameters.map(async (param, i) => {
                        const placeholder = getPlaceholder(param, i + 1);
                        const input = positionalInputs[i];
                        if (typeof input !== "string") {
                            if (typeof param.default === "string") {
                                return parseInput(placeholder, param, param.default, context);
                            }
                            if (param.optional) {
                                return;
                            }
                            throw new UnsatisfiedPositionalError(placeholder);
                        }
                        return parseInput(placeholder, param, input, context);
                    }),
                ) as Promise<PromiseSettledOrElseResult<ARGS>>;
            }

            if (activeFlag && activeFlag[1].kind === "parsed" && activeFlag[1].inferEmpty) {
                storeInput(flagInputs, config.caseStyle, activeFlag, "");
                activeFlag = void 0;
            }

            const flagEntries_p = allSettledOrElse(
                Object.entries(flags).map(async (entry) => {
                    const [internalFlagName, flag] = entry as [InternalFlagName, FlagParameter<CONTEXT>];
                    const externalFlagName = asExternal(internalFlagName, config.caseStyle);
                    if (activeFlag && activeFlag[0] === internalFlagName) {
                        throw new UnsatisfiedFlagError(externalFlagName);
                    }
                    const inputs = flagInputs.get(internalFlagName);
                    const value = await parseInputsForFlag(externalFlagName, flag, inputs, config, context);
                    return [internalFlagName, value] as const;
                }),
            );

            const [positionalValuesResult, flagEntriesResult] = await Promise.all([positionalValues_p, flagEntries_p]);
            if (positionalValuesResult.status === "rejected") {
                for (const reason of positionalValuesResult.reasons) {
                    errors.push(reason as ArgumentScannerError);
                }
            }
            if (flagEntriesResult.status === "rejected") {
                for (const reason of flagEntriesResult.reasons) {
                    errors.push(reason as ArgumentScannerError);
                }
            }

            if (errors.length > 0) {
                return { success: false, errors };
            }

            /* c8 ignore start */
            if (positionalValuesResult.status === "rejected") {
                throw new InternalError("Unknown failure while scanning positional arguments");
            }

            if (flagEntriesResult.status === "rejected") {
                throw new InternalError("Unknown failure while scanning flag arguments");
            }
            /* c8 ignore stop */

            const parsedFlags = Object.fromEntries(flagEntriesResult.value) as FLAGS;
            return { success: true, arguments: [parsedFlags, ...positionalValuesResult.value] };
        },
        proposeCompletions: async ({ partial, completionConfig, text, context, includeVersionFlag }) => {
            if (activeFlag) {
                return proposeFlagCompletionsForPartialInput<CONTEXT>(activeFlag[1], context, partial);
            }
            const completions: ArgumentCompletion[] = [];
            if (!treatInputsAsArguments) {
                const shorthandMatch = FLAG_SHORTHAND_PATTERN.exec(partial);
                if (completionConfig.includeAliases) {
                    if (partial === "" || partial === "-") {
                        const incompleteAliases = Object.entries(aliases).filter(
                            (entry) => !isFlagSatisfiedByInputs(flags, flagInputs, entry[1] as InternalFlagName),
                        );
                        for (const [alias] of incompleteAliases) {
                            const flag = resolvedAliases[alias as AvailableAlias];
                            if (flag) {
                                completions.push({
                                    kind: "argument:flag",
                                    completion: `-${alias}`,
                                    brief: flag[1].brief,
                                });
                            }
                        }
                    } else if (shorthandMatch) {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const partialAliases = Array.from(shorthandMatch[1]!);
                        if (partialAliases.includes("h")) {
                            return [];
                        }
                        if (includeVersionFlag && partialAliases.includes("v")) {
                            return [];
                        }
                        const flagInputsIncludingPartial = new Map(flagInputs);
                        for (const alias of partialAliases) {
                            const namedFlag = resolvedAliases[alias as AvailableAlias];
                            if (!namedFlag) {
                                throw new AliasNotFoundError(alias);
                            }
                            storeInput(
                                flagInputsIncludingPartial,
                                config.caseStyle,
                                namedFlag,
                                namedFlag[1].kind === "boolean" ? "true" : "1",
                            );
                        }
                        const lastAlias = partialAliases[partialAliases.length - 1];
                        if (lastAlias) {
                            const namedFlag = resolvedAliases[lastAlias as AvailableAlias];
                            if (namedFlag) {
                                completions.push({
                                    kind: "argument:flag",
                                    completion: partial,
                                    brief: namedFlag[1].brief,
                                });
                            }
                        }
                        const incompleteAliases = Object.entries(aliases).filter(
                            (entry) =>
                                !isFlagSatisfiedByInputs(
                                    flags,
                                    flagInputsIncludingPartial,
                                    entry[1] as InternalFlagName,
                                ),
                        );
                        for (const [alias] of incompleteAliases) {
                            const flag = resolvedAliases[alias as AvailableAlias];
                            if (flag) {
                                completions.push({
                                    kind: "argument:flag",
                                    completion: `${partial}${alias}`,
                                    brief: flag[1].brief,
                                });
                            }
                        }
                    }
                }
                if (partial === "" || partial === "-" || partial.startsWith("--")) {
                    if (config.allowArgumentEscapeSequence) {
                        completions.push({
                            kind: "argument:flag",
                            completion: "--",
                            brief: text.briefs.argumentEscapeSequence,
                        });
                    }
                    let incompleteFlags = Object.entries(flags).filter(
                        ([flagName]) => !isFlagSatisfiedByInputs(flags, flagInputs, flagName as InternalFlagName),
                    );
                    if (config.caseStyle === "allow-kebab-for-camel") {
                        incompleteFlags = incompleteFlags.map(([flagName, param]) => {
                            return [convertCamelCaseToKebabCase(flagName), param];
                        });
                    }
                    const possibleFlags = incompleteFlags
                        .map(([flagName, param]) => [`--${flagName}`, param] as const)
                        .filter(([flagName]) => flagName.startsWith(partial));
                    completions.push(
                        ...possibleFlags.map<ArgumentCompletion>(([name, param]) => {
                            return {
                                kind: "argument:flag",
                                completion: name,
                                brief: param.brief,
                            };
                        }),
                    );
                }
            }
            if (positional.kind === "array") {
                if (positional.parameter.proposeCompletions) {
                    if (typeof positional.maximum !== "number" || positionalIndex < positional.maximum) {
                        const positionalCompletions = await positional.parameter.proposeCompletions.call(
                            context,
                            partial,
                        );
                        completions.push(
                            ...positionalCompletions.map<ArgumentCompletion>((value) => {
                                return {
                                    kind: "argument:value",
                                    completion: value,
                                    brief: positional.parameter.brief,
                                };
                            }),
                        );
                    }
                }
            } else {
                const nextPositional = positional.parameters[positionalIndex];
                if (nextPositional?.proposeCompletions) {
                    const positionalCompletions = await nextPositional.proposeCompletions.call(context, partial);
                    completions.push(
                        ...positionalCompletions.map<ArgumentCompletion>((value) => {
                            return {
                                kind: "argument:value",
                                completion: value,
                                brief: nextPositional.brief,
                            };
                        }),
                    );
                }
            }
            return completions.filter(({ completion }) => completion.startsWith(partial));
        },
    };
}

async function proposeFlagCompletionsForPartialInput<CONTEXT extends CommandContext>(
    flag: FlagParserExpectingInput<CONTEXT>,
    context: CONTEXT,
    partial: string,
) {
    if (typeof flag.variadic === "string") {
        if (partial.endsWith(flag.variadic)) {
            return proposeFlagCompletionsForPartialInput(flag, context, "");
        }
    }
    let values: readonly string[];
    if (flag.kind === "enum") {
        values = flag.values;
    } else if (flag.proposeCompletions) {
        values = await flag.proposeCompletions.call(context, partial);
    } else {
        values = [];
    }
    return values
        .map<ArgumentCompletion>((value) => {
            return {
                kind: "argument:value",
                completion: value,
                brief: flag.brief,
            };
        })
        .filter(({ completion }) => completion.startsWith(partial));
}

/**
 * @internal
 */
export function listAllRouteNamesAndAliasesForScan(
    routeMap: RouteMap<never>,
    scannerCaseStyle: ScannerCaseStyle,
    config: CompletionConfiguration,
): readonly string[] {
    const displayCaseStyle = scannerCaseStyle === "allow-kebab-for-camel" ? "convert-camel-to-kebab" : scannerCaseStyle;
    let entries = routeMap.getAllEntries();
    if (!config.includeHiddenRoutes) {
        entries = entries.filter((entry) => !entry.hidden);
    }
    return entries.flatMap((entry) => {
        const routeName = entry.name[displayCaseStyle];
        if (config.includeAliases) {
            return [routeName, ...entry.aliases];
        }
        return [routeName];
    });
}
