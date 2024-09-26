// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { InputParser } from "../types";

function narrowString<T extends string>(choices: readonly T[], value: string): value is T {
    return choices.includes(value as T);
}

/**
 * Creates an input parser that checks if the input string is found in a list of choices.
 */
export function buildChoiceParser<T extends string>(choices: readonly T[]): InputParser<T> {
    return (input: string): T => {
        if (!narrowString(choices, input)) {
            throw new SyntaxError(`${input} is not one of (${choices.join("|")})`);
        }
        return input;
    };
}
