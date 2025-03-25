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

const TRUTHY_VALUES = new Set(["true", "t", "yes", "y", "on", "1"]);
const FALSY_VALUES = new Set(["false", "f", "no", "n", "off", "0"]);

/**
 * Parses input strings as booleans (loosely).
 * Transforms to lowercase and then checks against the following values:
 *  - `true`: `"true"`, `"t"`, `"yes"`, `"y"`, `"on"`, `"1"`
 *  - `false`: `"false"`, `"f"`, `"no"`, `"n"`, `"off"`, `"0"`
 */
export const looseBooleanParser = (input: string): boolean => {
    const value = input.toLowerCase();
    if (TRUTHY_VALUES.has(value)) {
        return true;
    }
    if (FALSY_VALUES.has(value)) {
        return false;
    }
    throw new SyntaxError(`Cannot convert ${input} to a boolean`);
};
