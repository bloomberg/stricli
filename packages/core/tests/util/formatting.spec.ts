// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
// eslint-disable-next-line no-restricted-imports
import { formatRowsWithColumns, type JoinGrammar, joinWithGrammar } from "../../src/util/formatting";

interface RowsWithColumnsTestCase {
    readonly cells: readonly (readonly string[])[];
    readonly separators?: readonly string[];
    readonly result: readonly string[];
}

function testRowsWithColumns(tests: readonly RowsWithColumnsTestCase[]) {
    describe("formatRowsWithColumns", () => {
        for (const test of tests) {
            it(`${JSON.stringify(test.cells)} ${JSON.stringify(test.separators)} => ${JSON.stringify(test.result)}`, () => {
                const result = formatRowsWithColumns(test.cells, test.separators);
                expect(result).to.deep.equal(test.result);
            });
        }
    });
}

testRowsWithColumns([
    { cells: [], separators: [], result: [] },
    { cells: [], result: [] },
    {
        cells: [
            ["a", "1"],
            ["b", "2"],
        ],
        result: ["a 1", "b 2"],
    },
    {
        cells: [
            ["a", "1"],
            ["b", "2"],
        ],
        separators: [" "],
        result: ["a 1", "b 2"],
    },
    {
        cells: [
            ["a", "1"],
            ["b", "2"],
        ],
        separators: ["|"],
        result: ["a|1", "b|2"],
    },
    {
        cells: [
            ["a", "1"],
            ["b", "2"],
        ],
        separators: ["---"],
        result: ["a---1", "b---2"],
    },
    {
        cells: [
            ["aaa", "1"],
            ["b", "2"],
        ],
        result: ["aaa 1", "b   2"],
    },
    { cells: [["a", "1"], ["b"]], result: ["a 1", "b"] },
    { cells: [["a", "1", "10", "100"], ["b"]], result: ["a 1 10 100", "b"] },
    { cells: [["a"], []], result: ["a", ""] },
]);

interface JoinTestCase {
    readonly parts: readonly string[];
    readonly grammar: JoinGrammar;
    readonly result: string;
}

function testJoins(tests: readonly JoinTestCase[]) {
    describe("joinWithGrammar", () => {
        for (const test of tests) {
            it(`[${test.parts.join()}] ${test.grammar.kind} => ${test.result}`, () => {
                const result = joinWithGrammar(test.parts, test.grammar);
                expect(result).to.equal(test.result);
            });
        }
    });
}

testJoins([
    { parts: [], grammar: { kind: "conjunctive", conjunction: "and" }, result: "" },
    { parts: ["one"], grammar: { kind: "conjunctive", conjunction: "and" }, result: "one" },
    { parts: ["one", "two"], grammar: { kind: "conjunctive", conjunction: "and" }, result: "one and two" },
    {
        parts: ["one", "two", "three"],
        grammar: { kind: "conjunctive", conjunction: "and" },
        result: "one, two and three",
    },
    {
        parts: ["one", "two", "three"],
        grammar: { kind: "conjunctive", conjunction: "and", serialComma: true },
        result: "one, two, and three",
    },
]);
