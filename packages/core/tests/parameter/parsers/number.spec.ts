// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { numberParser } from "../../../src";
import { testParser, testParserError } from "../parser";

describe("number parser", () => {
    testParser(numberParser, [
        ["0", 0],
        ["9007199254740991", 9007199254740991],
        ["-9007199254740991", -9007199254740991],
    ]);

    testParserError(numberParser, [
        ["O", "Cannot convert O to a number"],
        ["1trillion", "Cannot convert 1trillion to a number"],
    ]);
});
