// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

/**
 * Parses input strings as booleans.
 * Transforms to lowercase and then checks against "true" and "false".
 */
export const booleanParser = (input: string): boolean => {
    switch (input.toLowerCase()) {
        case "true":
            return true;
        case "false":
            return false;
    }
    throw new SyntaxError(`Cannot convert ${input} to a boolean`);
};

/**
 * Parses input strings as booleans (loosely).
 * Transforms to lowercase and then checks against "true", "false", "yes", "y", "no", and "n".
 */
export const looseBooleanParser = (input: string): boolean => {
    switch (input.toLowerCase()) {
        case "true":
        case "yes":
        case "y":
            return true;
        case "false":
        case "no":
        case "n":
            return false;
    }
    throw new SyntaxError(`Cannot convert ${input} to a boolean`);
};
