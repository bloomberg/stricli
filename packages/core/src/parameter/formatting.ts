// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { validateCaseStyleCompatibility } from "../application/integrations/help";
import type { DisplayCaseStyle, DocumentationConfiguration, ScannerCaseStyle } from "../config";
import type { CommandContext } from "../context";
import { convertCamelCaseToKebabCase } from "../util/case-style";
import { InternalError } from "../util/error";
import { type FlagParameter, isOptionalAtRuntime } from "./flag/types";
import type { PositionalParameter } from "./positional/types";
import type { CommandParameters } from "./types";

/**
 * Configuration for controlling how printed documentation is formatted.
 */
export interface FormattingConfiguration {
    /**
     * Controls whether or not to include alias of flags in the usage line.
     * Only replaces name with alias when a single alias exists.
     */
    readonly useAliasInUsageLine: boolean;
    /**
     * Controls whether or not to include optional flags and positional parameters in the usage line.
     * If enabled, all parameters that are optional at runtime (including parameters with defaults) will be hidden.
     */
    readonly onlyRequiredInUsageLine: boolean;
    /**
     * Case style configuration for displaying route and flag names.
     * Cannot be `convert-camel-to-kebab` if {@link ScannerConfiguration.caseStyle} is `original`.
     */
    readonly caseStyle: DisplayCaseStyle;
}

/**
 * @internal
 */
export function withDefaultFormattingConfiguration(
    config: Partial<FormattingConfiguration>,
    scannerCaseStyle: ScannerCaseStyle,
): FormattingConfiguration {
    let displayCaseStyle: DisplayCaseStyle;
    if (config.caseStyle) {
        displayCaseStyle = config.caseStyle;
    } else if (scannerCaseStyle === "allow-kebab-for-camel") {
        displayCaseStyle = "convert-camel-to-kebab";
    } else {
        displayCaseStyle = scannerCaseStyle;
    }
    validateCaseStyleCompatibility(scannerCaseStyle, displayCaseStyle);
    return {
        useAliasInUsageLine: config.useAliasInUsageLine ?? false,
        onlyRequiredInUsageLine: config.onlyRequiredInUsageLine ?? false,
        caseStyle: displayCaseStyle,
    };
}

/**
 * Contextual information used to format the usage text for a route/command.
 */
export interface UsageFormattingArguments {
    readonly prefix: readonly string[];
    readonly config: FormattingConfiguration;
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
