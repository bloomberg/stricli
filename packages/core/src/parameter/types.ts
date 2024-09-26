// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../context";
import type { FlagParameters, FlagParametersForType } from "./flag/types";
import type { BaseArgs, PositionalParameters, TypedPositionalParameters } from "./positional/types";

/**
 * Generic function that synchronously or asynchronously parses a string to an arbitrary type.
 */
export type InputParser<T, CONTEXT extends CommandContext = CommandContext> = (
    this: CONTEXT,
    input: string,
) => T | Promise<T>;

export interface ParsedParameter<T, CONTEXT extends CommandContext> {
    /**
     * Function to parse an input string to the type of this parameter.
     */
    readonly parse: InputParser<T, CONTEXT>;
    /**
     * Propose possible completions for a partial input string.
     */
    readonly proposeCompletions?: (this: CONTEXT, partial: string) => readonly string[] | Promise<readonly string[]>;
}

type LowercaseLetter =
    | "a"
    | "b"
    | "c"
    | "d"
    | "e"
    | "f"
    | "g"
    | "h"
    | "i"
    | "j"
    | "k"
    | "l"
    | "m"
    | "n"
    | "o"
    | "p"
    | "q"
    | "r"
    | "s"
    | "t"
    | "u"
    | "v"
    | "w"
    | "x"
    | "y"
    | "z";

type UppercaseLetter = Capitalize<LowercaseLetter>;

type ReservedAlias = "h";

export type AvailableAlias = Exclude<LowercaseLetter | UppercaseLetter, ReservedAlias>;

export type Aliases<T> = Readonly<Partial<Record<AvailableAlias, T>>>;

export type BaseFlags = Readonly<Record<string, unknown>>;

interface TypedCommandFlagParameters<FLAGS extends BaseFlags, CONTEXT extends CommandContext> {
    /**
     * Typed definitions for all flag parameters.
     */
    readonly flags: FlagParametersForType<FLAGS, CONTEXT>;
    /**
     * Object that aliases single characters to flag names.
     */
    readonly aliases?: Aliases<keyof FLAGS & string>;
}

type TypedCommandFlagParameters_<FLAGS extends BaseFlags, CONTEXT extends CommandContext> =
    Record<string, never> extends FLAGS
        ? Partial<TypedCommandFlagParameters<FLAGS, CONTEXT>>
        : TypedCommandFlagParameters<FLAGS, CONTEXT>;

interface TypedCommandPositionalParameters<ARGS extends BaseArgs, CONTEXT extends CommandContext> {
    /**
     * Typed definitions for all positional parameters.
     */
    readonly positional: TypedPositionalParameters<ARGS, CONTEXT>;
}

type TypedCommandPositionalParameters_<ARGS extends BaseArgs, CONTEXT extends CommandContext> = [] extends ARGS
    ? Partial<TypedCommandPositionalParameters<ARGS, CONTEXT>>
    : TypedCommandPositionalParameters<ARGS, CONTEXT>;

/**
 * Definitions for all parameters requested by the corresponding command.
 */
export type TypedCommandParameters<
    FLAGS extends BaseFlags,
    ARGS extends BaseArgs,
    CONTEXT extends CommandContext,
> = TypedCommandFlagParameters_<FLAGS, CONTEXT> & TypedCommandPositionalParameters_<ARGS, CONTEXT>;

/**
 * Definitions for all parameters requested by the corresponding command.
 * This is a separate version of {@link TypedCommandParameters} without a type parameter and is primarily used
 * internally and should only be used after the types are checked.
 */
export interface CommandParameters {
    readonly flags?: FlagParameters;
    readonly aliases?: Aliases<string>;
    readonly positional?: PositionalParameters;
}
