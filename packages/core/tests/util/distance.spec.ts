// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
// eslint-disable-next-line no-restricted-imports
import { damerauLevenshtein, type DamerauLevenshteinWeights, filterClosestAlternatives } from "../../src/util/distance";

const DEFAULT_WEIGHTS: DamerauLevenshteinWeights = {
    insertion: 1,
    deletion: 3,
    substitution: 2,
    transposition: 0,
};

type DistanceTestCase = readonly [a: string, b: string, distance: number];

function testDistance(a: string, b: string, threshold: number, distance: number) {
    it(`distance=${distance}, with threshold=${threshold}`, () => {
        const distanceAB = damerauLevenshtein(a, b, { threshold, weights: DEFAULT_WEIGHTS });
        expect(distanceAB).to.equal(
            distance,
            `Expected ${a} -> ${b} to have distance=${distance} with threshold=${threshold}`,
        );
    });
}

function testDistances(tests: readonly DistanceTestCase[]) {
    for (const test of tests) {
        describe(`${test[0]} -> ${test[1]}`, () => {
            testDistance(test[0], test[1], Infinity, test[2]);
            for (let threshold = 0; threshold <= test[2] + 1; ++threshold) {
                const limitedDistance = test[2] > threshold ? Infinity : test[2];
                testDistance(test[0], test[1], threshold, limitedDistance);
            }
        });
    }
}

describe("Edit Distance Calculations", () => {
    describe("damerauLevenshtein", () => {
        testDistances([
            ["foo", "foo", 0],
            ["foo", "bar", 3 * DEFAULT_WEIGHTS.substitution],
            ["bar", "baz", 1 * DEFAULT_WEIGHTS.substitution],
            ["bar", "bra", 1 * DEFAULT_WEIGHTS.transposition],
            ["foo", "foobar", 3 * DEFAULT_WEIGHTS.insertion],
            ["foobar", "foo", 3 * DEFAULT_WEIGHTS.deletion],
            ["dryrun", "dry-run", 1 * DEFAULT_WEIGHTS.insertion],
            ["proj", "prepare", 2 * DEFAULT_WEIGHTS.substitution + 3 * DEFAULT_WEIGHTS.insertion],
            ["noflag-name", "flagName", 3 * DEFAULT_WEIGHTS.deletion + 1 * DEFAULT_WEIGHTS.substitution],
        ]);
    });

    describe("filterClosestAlternatives", () => {
        it("sorts alternatives starting with target first", () => {
            // GIVEN
            const target = "ab";
            const values = ["ax", "abcd", "abab", "xyz"];

            // WHEN
            const alternatives = filterClosestAlternatives(target, values, { threshold: 7, weights: DEFAULT_WEIGHTS });

            // THEN
            expect(alternatives).to.deep.equal(["abab", "abcd", "ax"]);
        });
    });
});
