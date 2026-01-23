// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { ParsedParameter } from "../types";

interface BasePositionalParameter<T, CONTEXT extends CommandContext> extends ParsedParameter<T, CONTEXT> {
    /**
     * In-line documentation for this parameter.
     */
    readonly brief: string;
    /**
     * String that serves as placeholder for the value in the generated usage line.
     * Defaults to "argN" where N is the index of this parameter.
     */
    readonly placeholder?: string;
    /**
     * Default input value if one is not provided at runtime.
     */
    readonly default?: string;
    readonly optional?: boolean;
}

interface RequiredPositionalParameter<T, CONTEXT extends CommandContext> extends BasePositionalParameter<T, CONTEXT> {
    /**
     * Parameter is required and cannot be set as optional.
     */
    readonly optional?: false;
}

interface OptionalPositionalParameter<T, CONTEXT extends CommandContext> extends BasePositionalParameter<T, CONTEXT> {
    /**
     * Parameter is optional and must be specified as such.
     */
    readonly optional: true;
}

/**
 * Definition of a positional parameter that will eventually be parsed to an argument.
 * Required properties may vary depending on the type argument `T`.
 */
export type TypedPositionalParameter<T, CONTEXT extends CommandContext = CommandContext> = undefined extends T
    ? OptionalPositionalParameter<NonNullable<T>, CONTEXT>
    : RequiredPositionalParameter<T, CONTEXT>;

export type PositionalParameter = BasePositionalParameter<unknown, CommandContext>;

interface PositionalParameterArray<T, CONTEXT extends CommandContext> {
    readonly kind: "array";
    readonly parameter: TypedPositionalParameter<T, CONTEXT>;
    readonly minimum?: number;
    readonly maximum?: number;
}

/**
 * Positional parameter constrained to a specific set of string values.
 * Values are validated at runtime and proposed as completions.
 *
 * FLAT structure - all parameter properties are directly on this interface,
 * not nested under a `parameter` property. This matches the pattern used by
 * BaseEnumFlagParameter.
 */
export interface BaseEnumPositionalParameter<T extends string, CONTEXT extends CommandContext = CommandContext> {
    /**
     * Indicates positional should be constrained to enumeration values.
     */
    readonly kind: "enum";
    /**
     * Array of all possible enumerations supported by this positional.
     */
    readonly values: readonly T[];
    /**
     * In-line documentation for this parameter.
     */
    readonly brief: string;
    /**
     * String that serves as placeholder for the value in the generated usage line.
     * Defaults to "arg" if not specified.
     */
    readonly placeholder?: string;
    /**
     * Default input value if one is not provided at runtime.
     * Must be one of the values in the values array.
     */
    readonly default?: T;
    /**
     * Whether this parameter is optional.
     */
    readonly optional?: boolean;
}

type PositionalParametersForTuple<T, CONTEXT extends CommandContext> = {
    readonly [K in keyof T]: TypedPositionalParameter<T[K], CONTEXT>;
};

interface PositionalParameterTuple<T> {
    readonly kind: "tuple";
    readonly parameters: T;
}

/**
 * Root constraint for all positional argument type parameters.
 * This is used to ensure that positional parameters are always defined as an array or tuple.
 */
export type BaseArgs = readonly unknown[];

/**
 * Definition of all positional parameters.
 * Required properties may vary depending on the type argument `T.
 */
export type TypedPositionalParameters<T, CONTEXT extends CommandContext> = [T] extends [readonly (infer E)[]]
    ? number extends T["length"]
        ? PositionalParameterArray<E, CONTEXT>
        : PositionalParameterTuple<PositionalParametersForTuple<T, CONTEXT>>
    : PositionalParameterTuple<PositionalParametersForTuple<T, CONTEXT>>;

/**
 * Definition of all positional parameters.
 * This is a separate version of {@link TypedPositionalParameters} without a type parameter and is primarily used
 * internally and should only be used after the types are checked.
 */
export type PositionalParameters =
    | PositionalParameterArray<unknown, CommandContext>
    | PositionalParameterTuple<readonly PositionalParameter[]>
    | BaseEnumPositionalParameter<string, CommandContext>;
