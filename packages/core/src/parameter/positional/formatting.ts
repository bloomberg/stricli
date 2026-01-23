// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { HelpFormattingArguments } from "../../routing/types";
import { formatRowsWithColumns } from "../../util/formatting";
import type { BaseEnumPositionalParameter, PositionalParameter, PositionalParameters } from "./types";

/**
 * @internal
 */
export function formatDocumentationForPositionalParameters(
    positional: PositionalParameters,
    args: Pick<HelpFormattingArguments, "config" | "text" | "ansiColor">,
): readonly string[] {
    if (positional.kind === "enum") {
        const name = positional.placeholder ?? "arg";
        const enumValues = `(${positional.values.join("|")})`;
        const suffixParts: string[] = [enumValues];
        if (positional.default) {
            const defaultKeyword = args.ansiColor ? `\x1B[90m${args.text.keywords.default}\x1B[39m` : args.text.keywords.default;
            suffixParts.push(`${defaultKeyword} ${positional.default}`);
        }
        const suffix = positional.optional ? `[${suffixParts.join(", ")}]` : suffixParts.join(", ");
        const argName = args.ansiColor ? `\x1B[97m${name}\x1B[39m` : name;
        const brief = args.ansiColor ? `\x1B[3m${positional.brief}\x1B[23m` : positional.brief;
        return formatRowsWithColumns([[argName + " " + suffix, brief]], ["  "]);
    }
    if (positional.kind === "array") {
        const name = positional.parameter.placeholder ?? "args";
        const argName = args.ansiColor ? `\x1B[1m${name}...\x1B[22m` : `${name}...`;
        const brief = args.ansiColor ? `\x1B[3m${positional.parameter.brief}\x1B[23m` : positional.parameter.brief;
        return formatRowsWithColumns([[argName, brief]], ["  "]);
    }
    const { keywords } = args.text;
    const atLeastOneOptional = positional.parameters.some((def) => def.optional);
    return formatRowsWithColumns(
        positional.parameters.map((def: PositionalParameter, i) => {
            let name = def.placeholder ?? `arg${i + 1}`;
            let suffix: string | undefined;
            if (def.optional) {
                name = `[${name}]`;
            } else if (atLeastOneOptional) {
                name = ` ${name}`;
            }
            if (def.default) {
                const defaultKeyword = args.ansiColor ? `\x1B[2m${keywords.default}\x1B[22m` : keywords.default;
                suffix = `[${defaultKeyword} ${def.default}]`;
            }
            return [
                args.ansiColor ? `\x1B[1m${name}\x1B[22m` : name,
                args.ansiColor ? `\x1B[3m${def.brief}\x1B[23m` : def.brief,
                suffix ?? "",
            ];
        }),
        ["  ", " "],
    );
}
