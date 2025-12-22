// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { FlagParameter } from "../../parameter/flag/types";
import { formatUsageLineForParameters } from "../../parameter/formatting";
import type { BaseArgs } from "../../parameter/positional/types";
import type { BaseFlags, CommandParameters, TypedCommandParameters } from "../../parameter/types";
import { convertCamelCaseToKebabCase } from "../../util/case-style";
import { InternalError } from "../../util/error";
import { generateCommandHelpLines, type CommandDocumentation } from "./documentation";
import { CommandSymbol, type Command, type CommandFunction, type CommandFunctionLoader } from "./types";

type BaseCommandBuilderArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> = {
    /**
     * Definitions for all parameters requested by the corresponding command.
     */
    readonly parameters: NoInfer<TypedCommandParameters<FLAGS, ARGS, CONTEXT>>;
    /**
     * Help documentation for command.
     */
    readonly docs: CommandDocumentation;
};

type LazyCommandBuilderArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> = {
    /**
     * Asynchronously loads a module containing the action to be executed by a command.
     */
    readonly loader: CommandFunctionLoader<FLAGS, ARGS, CONTEXT>;
} & NoInfer<BaseCommandBuilderArguments<FLAGS, ARGS, CONTEXT>>;

type LocalCommandBuilderArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> = {
    /**
     * The action to be executed by a command.
     */
    readonly func: CommandFunction<FLAGS, ARGS, CONTEXT>;
} & NoInfer<BaseCommandBuilderArguments<FLAGS, ARGS, CONTEXT>>;

export type CommandBuilderArguments<FLAGS extends BaseFlags, ARGS extends BaseArgs, CONTEXT extends CommandContext> =
    | LazyCommandBuilderArguments<FLAGS, ARGS, CONTEXT>
    | LocalCommandBuilderArguments<FLAGS, ARGS, CONTEXT>;

function checkForReservedFlags(flags: Record<string, FlagParameter<CommandContext>>, reserved: string[]) {
    for (const flag of reserved) {
        if (flag in flags) {
            throw new InternalError(`Unable to use reserved flag --${flag}`);
        }
    }
}

function checkForReservedAliases(aliases: Record<string, string>, reserved: string[]) {
    for (const alias of reserved) {
        if (alias in aliases) {
            throw new InternalError(`Unable to use reserved alias -${alias}`);
        }
    }
}

function* asNegationFlagNames(flagName: string): Generator<string> {
    yield `no-${convertCamelCaseToKebabCase(flagName)}`;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    yield `no${flagName[0]!.toUpperCase()}${flagName.slice(1)}`;
}

function checkForNegationCollisions(flags: Record<string, FlagParameter<CommandContext>>): void {
    const flagsAllowingNegation = Object.entries(flags).filter(([, flag]) => flag.kind === "boolean" && !flag.optional);
    for (const [internalFlagName] of flagsAllowingNegation) {
        for (const negatedFlagName of asNegationFlagNames(internalFlagName)) {
            if (negatedFlagName in flags) {
                throw new InternalError(
                    `Unable to allow negation for --${internalFlagName} as it conflicts with --${negatedFlagName}`,
                );
            }
        }
    }
}

function checkForInvalidVariadicSeparators(flags: Record<string, FlagParameter<CommandContext>>): void {
    for (const [internalFlagName, flag] of Object.entries(flags)) {
        if ("variadic" in flag && typeof flag.variadic === "string") {
            if (flag.variadic.length < 1) {
                throw new InternalError(
                    `Unable to use "" as variadic separator for --${internalFlagName} as it is empty`,
                );
            }
            /* v8 ignore else -- @preserve */
            if (/\s/.test(flag.variadic)) {
                throw new InternalError(
                    `Unable to use "${flag.variadic}" as variadic separator for --${internalFlagName} as it contains whitespace`,
                );
            }
        }
    }
}

/**
 * Build command from loader or local function as action with associated parameters and documentation.
 */
export function buildCommand<
    // Normally FLAGS would extend BaseFlags, but when it does there are some unexpected and confusing failures with the
    // type inference for this function. Check out tests/type-inference.spec.ts for examples where this fails.
    // Thanks to @dragomirtitian for concocting this fix.
    const FLAGS extends Readonly<Partial<Record<keyof FLAGS, unknown>>> = NonNullable<unknown>,
    const ARGS extends BaseArgs = [],
    const CONTEXT extends CommandContext = CommandContext,
>(builderArgs: CommandBuilderArguments<FLAGS, ARGS, CONTEXT>): Command<CONTEXT> {
    const { flags = {}, aliases = {} } = builderArgs.parameters;
    checkForReservedFlags(flags, ["help", "helpAll", "help-all"]);
    checkForReservedAliases(aliases, ["h", "H"]);
    checkForNegationCollisions(flags);
    checkForInvalidVariadicSeparators(flags);
    let loader: CommandFunctionLoader<BaseFlags, BaseArgs, CONTEXT>;
    if ("func" in builderArgs) {
        /* v8 ignore next -- @preserve */
        loader = async () => builderArgs.func as CommandFunction<BaseFlags, BaseArgs, CONTEXT>;
    } else {
        loader = builderArgs.loader as CommandFunctionLoader<BaseFlags, BaseArgs, CONTEXT>;
    }
    return {
        kind: CommandSymbol,
        loader,
        parameters: builderArgs.parameters as CommandParameters,
        get brief(): string {
            return builderArgs.docs.brief;
        },
        /* v8 ignore next -- @preserve */
        get fullDescription(): string | undefined {
            return builderArgs.docs.fullDescription;
        },
        formatUsageLine: (args) => {
            return formatUsageLineForParameters(builderArgs.parameters as CommandParameters, args);
        },
        formatHelp: (args) => {
            const lines = [
                ...generateCommandHelpLines(builderArgs.parameters as CommandParameters, builderArgs.docs, args),
            ];
            const text = lines.join("\n");
            return text + "\n";
        },
        usesFlag: (flagName) => {
            return Boolean(flagName in flags || flagName in aliases);
        },
    };
}
