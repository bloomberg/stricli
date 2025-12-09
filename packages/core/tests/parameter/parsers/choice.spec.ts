// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe } from "vitest";
import { buildChoiceParser } from "../../../src";
import { testParser, testParserError } from "../parser";

describe("choice parser", () => {
    describe("(a|b)", () => {
        const parser = buildChoiceParser(["a", "b"]);

        testParser(parser, [
            ["a", "a"],
            ["b", "b"],
        ]);

        testParserError(parser, [
            ["A", "A is not one of (a|b)"],
            ["B", "B is not one of (a|b)"],
            ["c", "c is not one of (a|b)"],
        ]);
    });
});
