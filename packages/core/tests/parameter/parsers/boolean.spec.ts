// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { booleanParser, looseBooleanParser } from "../../../src";
import { testParser, testParserError } from "../parser";

describe("boolean parser", () => {
    testParser(booleanParser, [
        ["false", false],
        ["False", false],
        ["FALSE", false],
        ["true", true],
        ["True", true],
        ["TRUE", true],
    ]);

    testParserError(booleanParser, [
        ["t", "Cannot convert t to a boolean"],
        ["f", "Cannot convert f to a boolean"],
        ["yes", "Cannot convert yes to a boolean"],
        ["no", "Cannot convert no to a boolean"],
        ["0", "Cannot convert 0 to a boolean"],
        ["1", "Cannot convert 1 to a boolean"],
    ]);
});

describe("loose boolean parser", () => {
    testParser(looseBooleanParser, [
        ["false", false],
        ["False", false],
        ["FALSE", false],
        ["true", true],
        ["True", true],
        ["TRUE", true],
        ["yes", true],
        ["Yes", true],
        ["YES", true],
        ["y", true],
        ["no", false],
        ["No", false],
        ["NO", false],
        ["n", false],
    ]);

    testParserError(looseBooleanParser, [
        ["t", "Cannot convert t to a boolean"],
        ["f", "Cannot convert f to a boolean"],
        ["0", "Cannot convert 0 to a boolean"],
        ["1", "Cannot convert 1 to a boolean"],
    ]);
});
