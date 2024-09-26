// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DocumentationConfiguration } from "../config";
import type { CommandContext } from "../context";
import { convertCamelCaseToKebabCase } from "../util/case-style";
import { type FlagParameter, isOptionalAtRuntime } from "./flag/types";
import type { PositionalParameter } from "./positional/types";
import type { CommandParameters } from "./types";

/**
 * Contextual information used to format the usage text for a route/command.
 */
export interface UsageFormattingArguments {
    readonly prefix: readonly string[];
    readonly config: DocumentationConfiguration;
    readonly ansiColor: boolean;
}

function wrapRequiredFlag(text: string): string {
    return `(${text})`;
}

function wrapOptionalFlag(text: string): string {
    return `[${text}]`;
}

function wrapVariadicFlag(text: string): string {
    return `${text}...`;
}

function wrapRequiredParameter(text: string): string {
    return `<${text}>`;
}

function wrapOptionalParameter(text: string): string {
    return `[<${text}>]`;
}

function wrapVariadicParameter(text: string): string {
    return `<${text}>...`;
}

/**
 * @internal
 */
export function formatUsageLineForParameters(parameters: CommandParameters, args: UsageFormattingArguments): string {
    const flagsUsage = Object.entries<FlagParameter<CommandContext>>(parameters.flags ?? {})
        .filter(([, flag]) => {
            if (flag.hidden) {
                return false;
            }
            if (args.config.onlyRequiredInUsageLine && isOptionalAtRuntime(flag)) {
                return false;
            }
            return true;
        })
        .map(([name, flag]) => {
            let displayName =
                args.config.caseStyle === "convert-camel-to-kebab"
                    ? `--${convertCamelCaseToKebabCase(name)}`
                    : `--${name}`;
            if (parameters.aliases && args.config.useAliasInUsageLine) {
                const aliases = Object.entries(parameters.aliases).filter((entry) => entry[1] === name);
                if (aliases.length === 1 && aliases[0]) {
                    displayName = `-${aliases[0][0]}`;
                }
            }
            if (flag.kind === "boolean") {
                return [flag, displayName] as const;
            }
            if (flag.kind === "enum" && typeof flag.placeholder !== "string") {
                return [flag, `${displayName} ${flag.values.join("|")}`] as const;
            }
            const placeholder = flag.placeholder ?? "value";
            return [flag, `${displayName} ${placeholder}`] as const;
        })
        .map(([flag, usage]) => {
            if (flag.kind === "parsed" && flag.variadic) {
                if (isOptionalAtRuntime(flag)) {
                    return wrapVariadicFlag(wrapOptionalFlag(usage));
                }
                return wrapVariadicFlag(wrapRequiredFlag(usage));
            }
            if (isOptionalAtRuntime(flag)) {
                return wrapOptionalFlag(usage);
            }
            return wrapRequiredFlag(usage);
        });
    let positionalUsage: string[] = [];
    const positional = parameters.positional;
    if (positional) {
        if (positional.kind === "array") {
            positionalUsage = [wrapVariadicParameter(positional.parameter.placeholder ?? "args")];
        } else {
            let parameters = positional.parameters;
            if (args.config.onlyRequiredInUsageLine) {
                parameters = parameters.filter((param) => !param.optional && typeof param.default === "undefined");
            }
            positionalUsage = parameters.map((param: PositionalParameter, i) => {
                const argName = param.placeholder ?? `arg${i + 1}`;
                return param.optional || typeof param.default !== "undefined"
                    ? wrapOptionalParameter(argName)
                    : wrapRequiredParameter(argName);
            });
        }
    }
    return [...args.prefix, ...flagsUsage, ...positionalUsage].join(" ");
}
