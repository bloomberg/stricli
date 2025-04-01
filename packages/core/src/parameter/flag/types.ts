// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { ParsedParameter } from "../types";

interface BaseFlagParameter {
    /**
     * In-line documentation for this flag.
     */
    readonly brief: string;
    /**
     * String that serves as placeholder for the value in the generated usage line. Defaults to "value".
     */
    readonly placeholder?: string;
}

interface BaseBooleanFlagParameter extends BaseFlagParameter {
    /**
     * Indicates flag should be treated as a boolean.
     */
    readonly kind: "boolean";
    readonly optional?: boolean;
    /**
     * Default flag value if input is not provided at runtime.
     *
     * If no value is provided, boolean flags default to `false`.
     */
    readonly default?: boolean;
}

type RequiredBooleanFlagParameter = BaseBooleanFlagParameter & {
    /**
     * Parameter is required and cannot be set as optional.
     */
    readonly optional?: false;
} & (
        | {
              /**
               * Parameter is required and cannot be set as hidden without a default value.
               */
              readonly hidden?: false;
          }
        | {
              /**
               * Default input value if one is not provided at runtime.
               */
              readonly default: boolean;
              /**
               * Parameter should be hidden from all help text and proposed completions.
               * Only available for runtime-optional parameters.
               */
              readonly hidden: true;
          }
    );

interface OptionalBooleanFlagParameter extends BaseBooleanFlagParameter {
    /**
     * Parameter is optional and must be specified as such.
     */
    readonly optional: true;
    /**
     * Parameter should be hidden from all help text and proposed completions.
     * Only available for optional parameters.
     */
    readonly hidden?: boolean;
    /**
     * Optional parameters should not have default values.
     * This flag should be required if a value will always be provided.
     */
    readonly default?: undefined;
}

export type BooleanFlagParameter = RequiredBooleanFlagParameter | OptionalBooleanFlagParameter;

interface BaseCounterFlagParameter extends BaseFlagParameter {
    /**
     * Indicates flag should be treated as a counter.
     */
    readonly kind: "counter";
    readonly optional?: boolean;
}

interface RequiredCounterFlagParameter extends BaseCounterFlagParameter {
    /**
     * Parameter is required and cannot be set as optional.
     */
    readonly optional?: false;
    /**
     * Parameter is required and cannot be set as hidden.
     */
    readonly hidden?: false;
}

interface OptionalCounterFlagParameter extends BaseCounterFlagParameter {
    /**
     * Parameter is optional and must be specified as such.
     */
    readonly optional: true;
    /**
     * Parameter should be hidden from all help text and proposed completions.
     * Only available for optional parameters.
     */
    readonly hidden?: boolean;
}

export type CounterFlagParameter = RequiredCounterFlagParameter | OptionalCounterFlagParameter;

export interface BaseEnumFlagParameter<T extends string> extends BaseFlagParameter {
    /**
     * Indicates flag should be treated as an enumeration of strings.
     */
    readonly kind: "enum";
    /**
     * Array of all possible enumerations supported by this flag.
     */
    readonly values: readonly T[];
    /**
     * Default input value if one is not provided at runtime.
     */
    readonly default?: T;
    readonly optional?: boolean;
    readonly hidden?: boolean;
    readonly variadic?: boolean | string;
}

interface RequiredEnumFlagParameter<T extends string> extends BaseEnumFlagParameter<T> {
    /**
     * Parameter is required and cannot be set as optional.
     */
    readonly optional?: false;
    /**
     * Parameter is required and cannot be set as hidden.
     */
    readonly hidden?: false;
    /**
     * Parameter does not extend array and cannot be set as variadic.
     */
    readonly variadic?: false;
}

interface OptionalEnumFlagParameter<T extends string> extends BaseEnumFlagParameter<T> {
    /**
     * Parameter is optional and must be specified as such.
     */
    readonly optional: true;
    /**
     * Parameter should be hidden from all help text and proposed completions.
     * Only available for optional parameters.
     */
    readonly hidden?: boolean;
    /**
     * Parameter does not extend array and cannot be set as variadic.
     */
    readonly variadic?: false;
}

interface OptionalVariadicEnumFlagParameter<T extends string> extends BaseEnumFlagParameter<T> {
    /**
     * Default values are not supported for variadic parameters.
     */
    readonly default?: undefined;
    /**
     * Optional variadic parameter will parse to an empty array if no arguments are found.
     */
    readonly optional: true;
    /**
     * Parameter is required and cannot be set as hidden.
     */
    readonly hidden?: false;
    /**
     * Parameter extends array and must be set as variadic.
     * Also supports using an arbitrary string as a separator for individual inputs.
     * For example, `variadic: ","` will scan `--flag a,b,c` as `["a", "b", "c"]`.
     * If no separator is provided, the default behavior is to parse the input as a single string.
     * The separator cannot be the empty string or contain any whitespace.
     */
    readonly variadic: true | string;
}

interface RequiredVariadicEnumFlagParameter<T extends string> extends BaseEnumFlagParameter<T> {
    /**
     * Default values are not supported for variadic parameters.
     */
    readonly default?: undefined;
    /**
     * Parameter is required and cannot be set as optional.
     * Expects at least one value to be satisfied.
     */
    readonly optional?: false;
    /**
     * Parameter is required and cannot be set as hidden.
     */
    readonly hidden?: false;
    /**
     * Parameter extends array and must be set as variadic.
     * Also supports using an arbitrary string as a separator for individual inputs.
     * For example, `variadic: ","` will scan `--flag a,b,c` as `["a", "b", "c"]`.
     * If no separator is provided, the default behavior is to parse the input as a single string.
     * The separator cannot be the empty string or contain any whitespace.
     */
    readonly variadic: true | string;
}

export interface BaseParsedFlagParameter<T, CONTEXT extends CommandContext>
    extends ParsedParameter<T, CONTEXT>,
        BaseFlagParameter {
    /**
     * Indicates flag should be parsed with a specified input parser.
     */
    readonly kind: "parsed";
    /**
     * Default input value if one is not provided at runtime.
     */
    readonly default?: string;
    /**
     * If flag is specified with no corresponding input, infer an empty string `""` as the input.
     */
    readonly inferEmpty?: boolean;
    readonly optional?: boolean;
    readonly variadic?: boolean | string;
    readonly hidden?: boolean;
}

type RequiredParsedFlagParameter<T, CONTEXT extends CommandContext> = BaseParsedFlagParameter<T, CONTEXT> & {
    /**
     * Parameter is required and cannot be set as optional.
     */
    readonly optional?: false;
    /**
     * Parameter does not extend array and cannot be set as variadic.
     */
    readonly variadic?: false;
} & (
        | {
              /**
               * Parameter is required and cannot be set as hidden without a default value.
               */
              readonly hidden?: false;
          }
        | {
              /**
               * Default input value if one is not provided at runtime.
               */
              readonly default: string;
              /**
               * Parameter should be hidden from all help text and proposed completions.
               * Only available for runtime-optional parameters.
               */
              readonly hidden: true;
          }
    );

interface OptionalParsedFlagParameter<T, CONTEXT extends CommandContext> extends BaseParsedFlagParameter<T, CONTEXT> {
    /**
     * Parameter is optional and must be specified as such.
     */
    readonly optional: true;
    /**
     * Optional parameters should not have default values.
     * This flag should be required if a value will always be provided.
     */
    readonly default?: undefined;
    /**
     * Parameter does not extend array and cannot be set as variadic.
     */
    readonly variadic?: false;
    /**
     * Parameter should be hidden from all help text and proposed completions.
     * Only available for runtime-optional parameters.
     */
    readonly hidden?: boolean;
}

interface OptionalVariadicParsedFlagParameter<T, CONTEXT extends CommandContext>
    extends BaseParsedFlagParameter<T, CONTEXT> {
    /**
     * Variadic flags are always optional in that they will parse to an empty array if no arguments are found.
     */
    readonly optional: true;
    /**
     * Parameter extends array and must be set as variadic.
     * Also supports using an arbitrary string as a separator for individual inputs.
     * For example, `variadic: ","` will scan `--flag a,b,c` as `["a", "b", "c"]`.
     * If no separator is provided, the default behavior is to parse the input as a single string.
     * The separator cannot be the empty string or contain any whitespace.
     */
    readonly variadic: true | string;
    /**
     * Default values are not supported for variadic parameters.
     */
    readonly default?: undefined;
}

interface RequiredVariadicParsedFlagParameter<T, CONTEXT extends CommandContext>
    extends BaseParsedFlagParameter<T, CONTEXT> {
    /**
     * Parameter is required and cannot be set as optional.
     * Expects at least one value to be satisfied.
     */
    readonly optional?: false;
    /**
     * Parameter extends array and must be set as variadic.
     * Also supports using an arbitrary string as a separator for individual inputs.
     * For example, `variadic: ","` will scan `--flag a,b,c` as `["a", "b", "c"]`.
     * If no separator is provided, the default behavior is to parse the input as a single string.
     * The separator cannot be the empty string or contain any whitespace.
     */
    readonly variadic: true | string;
    /**
     * Default values are not supported for variadic parameters.
     */
    readonly default?: undefined;
}

type TypedFlagParameter_Optional<T, CONTEXT extends CommandContext> = [T] extends [readonly (infer A)[]]
    ? [A] extends [string]
        ?
              | OptionalVariadicParsedFlagParameter<A, CONTEXT>
              | OptionalParsedFlagParameter<T, CONTEXT>
              | OptionalVariadicEnumFlagParameter<A>
        : OptionalVariadicParsedFlagParameter<A, CONTEXT> | OptionalParsedFlagParameter<T, CONTEXT>
    : [T] extends [boolean]
      ? OptionalBooleanFlagParameter | OptionalParsedFlagParameter<boolean, CONTEXT>
      : [T] extends [number]
        ? OptionalCounterFlagParameter | OptionalParsedFlagParameter<number, CONTEXT>
        : string extends T
          ? OptionalParsedFlagParameter<string, CONTEXT>
          : [T] extends [string]
            ? OptionalEnumFlagParameter<T> | OptionalParsedFlagParameter<T, CONTEXT>
            : OptionalParsedFlagParameter<T, CONTEXT>;

type TypedFlagParameter_Required<T, CONTEXT extends CommandContext> = [T] extends [readonly (infer A)[]]
    ? [A] extends [string]
        ?
              | RequiredVariadicParsedFlagParameter<A, CONTEXT>
              | RequiredParsedFlagParameter<readonly A[], CONTEXT>
              | RequiredVariadicEnumFlagParameter<A>
        : RequiredVariadicParsedFlagParameter<A, CONTEXT> | RequiredParsedFlagParameter<readonly A[], CONTEXT>
    : [T] extends [boolean]
      ? RequiredBooleanFlagParameter | RequiredParsedFlagParameter<boolean, CONTEXT>
      : [T] extends [number]
        ? RequiredCounterFlagParameter | RequiredParsedFlagParameter<number, CONTEXT>
        : string extends T
          ? RequiredParsedFlagParameter<string, CONTEXT>
          : [T] extends [string]
            ? RequiredEnumFlagParameter<T> | RequiredParsedFlagParameter<T, CONTEXT>
            : RequiredParsedFlagParameter<T, CONTEXT>;

/**
 * Definition of a flag parameter that will eventually be parsed as a flag.
 * Required properties may vary depending on the type argument `T`.
 */
export type TypedFlagParameter<T, CONTEXT extends CommandContext = CommandContext> = undefined extends T
    ? TypedFlagParameter_Optional<NonNullable<T>, CONTEXT>
    : TypedFlagParameter_Required<T, CONTEXT>;

export type FlagParameter<CONTEXT extends CommandContext> =
    | BooleanFlagParameter
    | CounterFlagParameter
    | BaseEnumFlagParameter<string>
    | BaseParsedFlagParameter<unknown, CONTEXT>;

/**
 * Definition of flags for each named parameter.
 * Required properties may vary depending on the type argument `T`.
 */
export type FlagParametersForType<T, CONTEXT extends CommandContext = CommandContext> = {
    readonly [K in keyof T]: TypedFlagParameter<T[K], CONTEXT>;
};

/**
 * Definition of flags for each named parameter.
 * This is a separate version of {@link FlagParametersForType} without a type parameter and is primarily used internally
 * and should only be used after the types are checked.
 */
export type FlagParameters<CONTEXT extends CommandContext = CommandContext> = Record<string, FlagParameter<CONTEXT>>;

export function hasDefault<CONTEXT extends CommandContext>(
    flag: FlagParameter<CONTEXT>,
): flag is FlagParameter<CONTEXT> & { default: string | boolean } {
    return "default" in flag && typeof flag.default !== "undefined";
}

export function isOptionalAtRuntime<CONTEXT extends CommandContext>(
    flag: FlagParameter<CONTEXT>,
): flag is FlagParameter<CONTEXT> & { optional: true } {
    return flag.optional ?? hasDefault(flag);
}
