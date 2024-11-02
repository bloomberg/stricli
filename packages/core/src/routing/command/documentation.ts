// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { formatDocumentationForFlagParameters, generateBuiltInFlagUsageLines } from "../../parameter/flag/formatting";
import { formatUsageLineForParameters } from "../../parameter/formatting";
import { formatDocumentationForPositionalParameters } from "../../parameter/positional/formatting";
import type { CommandParameters } from "../../parameter/types";
import type { HelpFormattingArguments } from "../types";

export interface CustomUsage {
    readonly input: string;
    readonly brief: string;
}

export interface CommandDocumentation {
    /**
     * In-line documentation for this command.
     */
    readonly brief: string;
    /**
     * Longer description of this command's behavior, only printed during `--help`.
     */
    readonly fullDescription?: string;
    /**
     * Sample usage to replace the generated usage lines.
     */
    readonly customUsage?: readonly (string | CustomUsage)[];
}

/**
 * @internal
 */
export function* generateCommandHelpLines(
    parameters: CommandParameters,
    docs: CommandDocumentation,
    args: HelpFormattingArguments,
): Generator<string> {
    const { brief, fullDescription, customUsage } = docs;
    const { headers } = args.text;
    const prefix = args.prefix.join(" ");
    yield args.ansiColor ? `\x1B[1m${headers.usage}\x1B[22m` : headers.usage;
    if (customUsage) {
        for (const usage of customUsage) {
            if (typeof usage === "string") {
                yield `  ${prefix} ${usage}`;
            } else {
                const brief = args.ansiColor ? `\x1B[3m${usage.brief}\x1B[23m` : usage.brief;
                yield `  ${prefix} ${usage.input}\n    ${brief}`;
            }
        }
    } else {
        yield `  ${formatUsageLineForParameters(parameters, args)}`;
    }
    for (const line of generateBuiltInFlagUsageLines(args)) {
        yield `  ${prefix} ${line}`;
    }
    yield "";
    yield fullDescription ?? brief;
    if (args.aliases && args.aliases.length > 0) {
        const aliasPrefix = args.prefix.slice(0, -1).join(" ");
        yield "";
        yield args.ansiColor ? `\x1B[1m${headers.aliases}\x1B[22m` : headers.aliases;
        for (const alias of args.aliases) {
            yield `  ${aliasPrefix} ${alias}`;
        }
    }
    yield "";
    yield args.ansiColor ? `\x1B[1m${headers.flags}\x1B[22m` : headers.flags;
    for (const line of formatDocumentationForFlagParameters(parameters.flags ?? {}, parameters.aliases ?? {}, args)) {
        yield `  ${line}`;
    }
    const positional = parameters.positional ?? { kind: "tuple", parameters: [] };
    if (positional.kind === "array" || positional.parameters.length > 0) {
        yield "";
        yield args.ansiColor ? `\x1B[1m${headers.arguments}\x1B[22m` : headers.arguments;
        for (const line of formatDocumentationForPositionalParameters(positional, args)) {
            yield `  ${line}`;
        }
    }
}
