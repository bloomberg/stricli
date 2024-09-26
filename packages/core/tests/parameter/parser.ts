// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import assert from "assert";
import { expect } from "chai";
import type { CommandContext, InputParser } from "../../src";

type ParserTestCase<T> = readonly [input: string, value: T, context?: CommandContext];

export function testParser<T>(parse: InputParser<T>, tests: readonly ParserTestCase<T>[]) {
    for (const test of tests) {
        it(`parses ${test[0]}`, async () => {
            const value = await parse.call(test[2] ?? { process }, test[0]);
            expect(value).to.deep.equal(test[1]);
        });
    }
}

type ParserErrorTestCase = readonly [input: string, message: string, context?: CommandContext];

export function testParserError<T>(parse: InputParser<T>, tests: readonly ParserErrorTestCase[]) {
    for (const test of tests) {
        it(`fails to parse ${test[0]}`, async () => {
            try {
                const parsed = Promise.resolve(parse.call(test[2] ?? { process }, test[0]));
                await parsed.then(
                    () => {
                        throw new Error(`Expected parse to throw with message=${test[1]}`);
                    },
                    (exc: unknown) => {
                        assert(exc instanceof Error);
                        expect(exc).to.have.property("message", test[1]);
                    },
                );
            } catch (exc) {
                assert(exc instanceof Error);
                expect(exc).to.have.property("message", test[1]);
            }
        });
    }
}
