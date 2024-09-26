// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { BaseArgs } from "../../parameter/positional/types";
import type { BaseFlags, CommandParameters } from "../../parameter/types";
import type { DocumentedTarget } from "../types";

/**
 * All command functions are required to have a general signature:
 * ```ts
 * (flags: {...}, ...args: [...]) => void | Promise<void>
 * ```
 * - `args` should be an array/tuple of any length or type.
 * - `flags` should be an object with any key-value pairs.
 *
 * The specific types of `args` and `flags` are customizable to the individual use case
 * and will be used to determine the structure of the positional arguments and flags.
 */
export type CommandFunction<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> = (
    this: CONTEXT,
    flags: FLAGS,
    ...args: ARGS
) => void | Error | Promise<void | Error>;

/**
 * A command module exposes the target function as the default export.
 */
export interface CommandModule<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> {
    readonly default: CommandFunction<FLAGS, ARGS, CONTEXT>;
}

/**
 * Asynchronously loads a function or a module containing a function to be executed by a command.
 */
export type CommandFunctionLoader<
    FLAGS extends BaseFlags,
    ARGS extends BaseArgs,
    CONTEXT extends CommandContext,
> = () => Promise<CommandModule<FLAGS, ARGS, CONTEXT> | CommandFunction<FLAGS, ARGS, CONTEXT>>;

export const CommandSymbol = Symbol("Command");

/**
 * Parsed and validated command instance.
 */
export interface Command<CONTEXT extends CommandContext> extends DocumentedTarget {
    readonly kind: typeof CommandSymbol;
    readonly loader: CommandFunctionLoader<BaseFlags, BaseArgs, CONTEXT>;
    readonly parameters: CommandParameters;
    readonly usesFlag: (flagName: string) => boolean;
}
