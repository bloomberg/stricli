// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildCommand, numberParser, type CommandContext } from "../../src";

/**
 * Command with tuple positional parameters and mixed flag types.
 * Flags: alpha (parsed/number), bravo (variadic/parsed/number),
 *        charlie (optional/parsed/number, placeholder "c"), delta (boolean)
 * Positional: [string, optional number]
 * Aliases: a→alpha, d→delta
 */
export function buildMixedParametersCommand() {
    return buildCommand({
        loader: async () => {
            return {
                default: (
                    flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                    arg0: string,
                    arg1?: number,
                ) => {},
            };
        },
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        brief: "first argument brief",
                        parse: (x) => x,
                    },
                    {
                        brief: "second argument brief",
                        optional: true,
                        parse: numberParser,
                    },
                ],
            },
            flags: {
                alpha: {
                    brief: "alpha flag brief",
                    kind: "parsed",
                    parse: numberParser,
                },
                bravo: {
                    brief: "bravo flag brief",
                    kind: "parsed",
                    variadic: true,
                    parse: numberParser,
                },
                charlie: {
                    brief: "charlie flag brief",
                    placeholder: "c",
                    kind: "parsed",
                    optional: true,
                    parse: numberParser,
                },
                delta: {
                    brief: "delta flag brief",
                    kind: "boolean",
                },
            },
            aliases: {
                a: "alpha",
                d: "delta",
            },
        },
        docs: { brief: "brief" },
    });
}

interface MixedParametersArrayDocs {
    readonly brief: string;
    readonly fullDescription?: string;
    readonly customUsage?: readonly (string | { readonly input: string; readonly brief: string })[];
}

/**
 * Command with array positional parameter and mixed flag types.
 * Same flags/aliases as buildMixedParametersCommand but with variadic string positional.
 */
export function buildMixedParametersArrayCommand(docs: MixedParametersArrayDocs = { brief: "brief" }) {
    return buildCommand({
        loader: async () => {
            return {
                default: (
                    flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                    ...args: string[]
                ) => {},
            };
        },
        parameters: {
            positional: {
                kind: "array",
                parameter: {
                    brief: "string array brief",
                    parse: (x) => x,
                },
            },
            flags: {
                alpha: {
                    brief: "alpha flag brief",
                    kind: "parsed",
                    parse: numberParser,
                },
                bravo: {
                    brief: "bravo flag brief",
                    kind: "parsed",
                    variadic: true,
                    parse: numberParser,
                },
                charlie: {
                    brief: "charlie flag brief",
                    placeholder: "c",
                    kind: "parsed",
                    optional: true,
                    parse: numberParser,
                },
                delta: {
                    brief: "delta flag brief",
                    kind: "boolean",
                },
            },
            aliases: {
                a: "alpha",
                d: "delta",
            },
        },
        docs,
    });
}
