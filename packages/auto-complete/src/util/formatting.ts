// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
interface ConjuctiveJoin {
    readonly conjunction: string;
    readonly serialComma?: boolean;
}

/**
 * @internal
 */
export type JoinGrammar = ConjuctiveJoin;

/**
 * @internal
 */
/* v8 ignore next -- @preserve */
export function joinWithGrammar(parts: readonly string[], grammar: JoinGrammar): string {
    if (parts.length <= 1) {
        return parts[0] ?? "";
    }
    if (parts.length === 2) {
        return parts.join(` ${grammar.conjunction} `);
    }
    let allButLast = parts.slice(0, parts.length - 1).join(", ");
    if (grammar.serialComma) {
        allButLast += ",";
    }
    return [allButLast, grammar.conjunction, parts[parts.length - 1]].join(" ");
}
