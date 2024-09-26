// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

/**
 * Parses input strings as numbers.
 */
export const numberParser = (input: string): number => {
    const value = Number(input);
    if (Number.isNaN(value)) {
        throw new SyntaxError(`Cannot convert ${input} to a number`);
    }
    return value;
};
