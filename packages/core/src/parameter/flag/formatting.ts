// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { formatForDisplay, formatAsNegated, type DisplayCaseStyle } from "../../config";
import type { CommandContext } from "../../context";
import type { HelpFormattingArguments } from "../../routing/types";
import { formatRowsWithColumns } from "../../util/formatting";
import type { Aliases, AvailableAlias } from "../types";
import { type FlagParameter, type FlagParameters, hasDefault, isOptionalAtRuntime } from "./types";

/**
 * Object that represents a flag that should be documented in addition to the flags that are defined in the command.
 */
export type AdditionalFlagDocumentation = {
    /**
     * Name of the flag, as it appears in the specification (with respect to case styling).
     */
    readonly name: string;
    /**
     * In-line documentation for this flag.
     */
    readonly brief: string;
    /**
     * Single-character shorthand aliases to list for this flag.
     */
    readonly aliases?: readonly AvailableAlias[];
    /**
     * When `true`, this flag will be hidden from help text output, unless hidden flags are explicitly included.
     */
    readonly hidden?: boolean;
};

type FormattedRow = {
    readonly aliases: string;
    readonly flagName: string;
    readonly brief: string;
    readonly suffix?: string;
    readonly hidden?: boolean;
};

export function formatRowForAdditionalFlag(
    flag: AdditionalFlagDocumentation,
    caseStyle: DisplayCaseStyle,
): FormattedRow {
    return {
        aliases: flag.aliases ? flag.aliases.map((alias) => `-${alias}`).join(" ") : "",
        flagName: `--${formatForDisplay(flag.name, caseStyle)}`,
        brief: flag.brief,
        hidden: flag.hidden,
    };
}

/**
 * @internal
 */
export function formatDocumentationForFlagParameters(
    flags: FlagParameters,
    aliases: Aliases<string>,
    args: Omit<HelpFormattingArguments, "prefix">,
): readonly string[] {
    const { keywords } = args.text;
    const visibleFlags = Object.entries<FlagParameter<CommandContext>>(flags).filter(([, flag]) => {
        if (flag.hidden && !args.includeHidden) {
            return false;
        }
        return true;
    });
    const atLeastOneOptional = visibleFlags.some(([, flag]) => isOptionalAtRuntime(flag));
    const rows = visibleFlags.map<FormattedRow>(([name, flag]) => {
        const aliasStrings = Object.entries(aliases)
            .filter((entry) => entry[1] === name)
            .map(([alias]) => `-${alias}`);

        let flagName = "--" + formatForDisplay(name, args.config.caseStyle);
        if (flag.kind === "boolean" && flag.default !== false && flag.withNegated !== false) {
            const negatedFlagName = formatAsNegated(name, args.config.caseStyle);
            flagName = `${flagName}/--${negatedFlagName}`;
        }

        if (isOptionalAtRuntime(flag)) {
            flagName = `[${flagName}]`;
        } else if (atLeastOneOptional) {
            flagName = ` ${flagName}`;
        }

        if (flag.kind === "parsed" && flag.variadic) {
            flagName = `${flagName}...`;
        }

        const suffixParts: string[] = [];
        if (flag.kind === "enum") {
            const choices = flag.values.join("|");
            suffixParts.push(choices);
        }
        if (hasDefault(flag)) {
            const defaultKeyword = args.ansiColor ? `\x1B[2m${keywords.default}\x1B[22m` : keywords.default;
            let defaultValue: string;
            if (Array.isArray(flag.default)) {
                // Format array defaults
                if (flag.default.length === 0) {
                    defaultValue = "[]";
                } else {
                    // Use custom separator if provided, otherwise use space
                    const separator = "variadic" in flag && typeof flag.variadic === "string" ? flag.variadic : " ";
                    defaultValue = flag.default.join(separator);
                }
            } else {
                defaultValue = flag.default === "" ? `""` : String(flag.default);
            }
            suffixParts.push(`${defaultKeyword} ${defaultValue}`);
        }
        if ("variadic" in flag && typeof flag.variadic === "string") {
            const separatorKeyword = args.ansiColor ? `\x1B[2m${keywords.separator}\x1B[22m` : keywords.separator;
            suffixParts.push(`${separatorKeyword} ${flag.variadic}`);
        }
        const suffix = suffixParts.length > 0 ? `[${suffixParts.join(", ")}]` : void 0;

        return {
            aliases: aliasStrings.join(" "),
            flagName,
            brief: flag.brief,
            suffix,
            hidden: flag.hidden,
        };
    });
    for (const flag of args.additionalFlags) {
        if (flag.hidden && !args.includeHidden) {
            continue;
        }
        const row = formatRowForAdditionalFlag(flag, args.config.caseStyle);
        rows.push({
            ...row,
            flagName: atLeastOneOptional ? ` ${row.flagName}` : row.flagName,
        });
    }
    if (args.includeArgumentEscapeSequenceFlag) {
        rows.push({
            aliases: "",
            flagName: atLeastOneOptional ? " --" : "--",
            brief: args.text.briefs.argumentEscapeSequence,
        });
    }
    return formatRowsWithColumns(
        rows.map((row) => {
            if (!args.ansiColor) {
                return [row.aliases, row.flagName, row.brief, row.suffix ?? ""];
            }
            return [
                row.hidden ? `\x1B[2m${row.aliases}\x1B[22m` : `\x1B[1m${row.aliases}\x1B[22m`,
                row.hidden ? `\x1B[2m${row.flagName}\x1B[22m` : `\x1B[1m${row.flagName}\x1B[22m`,
                row.hidden ? `\x1B[2;3m${row.brief}\x1B[22;23m` : `\x1B[;;3m${row.brief}\x1B[;;;23m`,
                row.suffix ?? "",
            ];
        }),
        [" ", "  ", " "],
    );
}

/**
 * @internal
 */
export function* generateUsageLinesForAdditionalFlags(
    flags: readonly AdditionalFlagDocumentation[],
    includeHidden: boolean,
    caseStyle: DisplayCaseStyle,
    useAliasInUsageLine: boolean,
): Generator<string> {
    for (const flag of flags) {
        if (flag.hidden && !includeHidden) {
            continue;
        }
        if (useAliasInUsageLine && flag.aliases && flag.aliases.length > 0) {
            yield `-${flag.aliases[0]}`;
        } else {
            yield `--${formatForDisplay(flag.name, caseStyle)}`;
        }
    }
}
