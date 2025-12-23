// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { formatForDisplay, formatAsNegated } from "../../config";
import type { CommandContext } from "../../context";
import type { HelpFormattingArguments } from "../../routing/types";
import { formatRowsWithColumns } from "../../util/formatting";
import type { Aliases } from "../types";
import { type FlagParameter, type FlagParameters, hasDefault, isOptionalAtRuntime } from "./types";

interface FormattedRow {
    readonly aliases: string;
    readonly flagName: string;
    readonly brief: string;
    readonly suffix?: string;
    readonly hidden?: boolean;
}

/**
 * @internal
 */
export function formatDocumentationForFlagParameters(
    flags: FlagParameters,
    aliases: Aliases<string>,
    args: Omit<HelpFormattingArguments, "prefix">,
): readonly string[] {
    const { keywords, briefs } = args.text;
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
            const defaultKeyword = args.ansiColor ? `\x1B[90m${keywords.default}\x1B[39m` : keywords.default;
            suffixParts.push(`${defaultKeyword} ${flag.default === "" ? `""` : String(flag.default)}`);
        }
        if ("variadic" in flag && typeof flag.variadic === "string") {
            const separatorKeyword = args.ansiColor ? `\x1B[90m${keywords.separator}\x1B[39m` : keywords.separator;
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
    rows.push({
        aliases: "-h",
        flagName: atLeastOneOptional ? " --help" : "--help",
        brief: briefs.help,
    });
    if (args.includeHelpAllFlag) {
        const helpAllFlagName = formatForDisplay("helpAll", args.config.caseStyle);
        rows.push({
            aliases: "-H",
            flagName: atLeastOneOptional ? ` --${helpAllFlagName}` : `--${helpAllFlagName}`,
            brief: briefs.helpAll,
            hidden: !args.config.alwaysShowHelpAllFlag,
        });
    }
    if (args.includeVersionFlag) {
        rows.push({
            aliases: "-v",
            flagName: atLeastOneOptional ? " --version" : "--version",
            brief: briefs.version,
        });
    }
    if (args.includeArgumentEscapeSequenceFlag) {
        rows.push({
            aliases: "",
            flagName: atLeastOneOptional ? " --" : "--",
            brief: briefs.argumentEscapeSequence,
        });
    }
    return formatRowsWithColumns(
        rows.map((row) => {
            if (!args.ansiColor) {
                return [row.aliases, row.flagName, row.brief, row.suffix ?? ""];
            }
            return [
                row.hidden ? `\x1B[90m${row.aliases}\x1B[39m` : `\x1B[97m${row.aliases}\x1B[39m`,
                row.hidden ? `\x1B[90m${row.flagName}\x1B[39m` : `\x1B[97m${row.flagName}\x1B[39m`,
                row.hidden ? `\x1B[90m${row.brief}\x1B[39m` : `\x1B[03m${row.brief}\x1B[23m`,
                row.suffix ?? "",
            ];
        }),
        [" ", "  ", " "],
    );
}

/**
 * @internal
 */
export function* generateBuiltInFlagUsageLines(args: HelpFormattingArguments): Generator<string> {
    yield args.config.useAliasInUsageLine ? "-h" : "--help";
    if (args.includeHelpAllFlag) {
        const helpAllFlagName = formatForDisplay("helpAll", args.config.caseStyle);
        yield args.config.useAliasInUsageLine ? "-H" : `--${helpAllFlagName}`;
    }
    if (args.includeVersionFlag) {
        yield args.config.useAliasInUsageLine ? "-v" : "--version";
    }
}
