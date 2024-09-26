// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
interface SparseMatrix {
    readonly get: (...args: [i: number, j: number]) => number;
    readonly set: (value: number, ...args: [i: number, j: number]) => void;
    // readonly toString: (iRange: [number, number], jRange: [number, number]) => string;
}

function newSparseMatrix(defaultValue: number): SparseMatrix {
    const values = new Map<string, number>();
    return {
        get: (...args) => {
            /* c8 ignore next */
            return values.get(args.join(",")) ?? defaultValue;
        },
        set: (value, ...args) => {
            values.set(args.join(","), value);
        },
        // toString([iMin, iMax], [jMin, jMax]) {
        //   const rows: string[] = [];
        //   for (let i = iMin; i <= iMax; ++i) {
        //     const row: string[] = [];
        //     for (let j = jMin; j <= jMax; ++j) {
        //       row.push(this.get(i, j).toString());
        //     }
        //     rows.push(row.join(", "));
        //   }
        //   return rows.join("\n");
        // },
    };
}

/**
 * The weights of various edit operations used when calculating the Damerau-Levenshtein distance.
 */
export interface DamerauLevenshteinWeights {
    /**
     * The edit cost of inserting a character.
     *
     * Example: `"ab" -> "abc"`
     */
    readonly insertion: number;
    /**
     * The edit cost of deleting a character.
     *
     * Example: `"abc" -> "ab"`
     */
    readonly deletion: number;
    /**
     * The edit cost of replacing one character with another.
     *
     * Example: `"abc" -> "arc"`
     */
    readonly substitution: number;
    /**
     * The edit cost of swapping two adjacent characters.
     *
     * Example: `"acb" -> "abc"`
     */
    readonly transposition: number;
}

/**
 * Customizable options for edit cost weights and threshold when calculating the Damerau-Levenshtein distance.
 */
export interface DamerauLevenshteinOptions {
    /**
     * The upper threshold for edit distance when considering potential alternatives.
     */
    readonly threshold: number;
    /**
     * The weights of various edit operations used when calculating the Damerau-Levenshtein distance.
     */
    readonly weights: DamerauLevenshteinWeights;
}

/**
 * @internal
 */
export function damerauLevenshtein(a: string, b: string, options: DamerauLevenshteinOptions): number {
    const { threshold, weights } = options;
    if (a === b) {
        return 0;
    }
    const lengthDiff = Math.abs(a.length - b.length);
    if (typeof threshold === "number" && lengthDiff > threshold) {
        return Infinity;
    }

    const matrix = newSparseMatrix(Infinity);
    matrix.set(0, -1, -1);
    for (let j = 0; j < b.length; ++j) {
        matrix.set((j + 1) * weights.insertion, -1, j);
    }
    for (let i = 0; i < a.length; ++i) {
        matrix.set((i + 1) * weights.deletion, i, -1);
    }

    let prevRowMinDistance = -Infinity;
    for (let i = 0; i < a.length; ++i) {
        let rowMinDistance = Infinity;
        for (let j = 0; j <= b.length - 1; ++j) {
            const cost = a[i] === b[j] ? 0 : 1;
            const distances = [
                // deletion
                matrix.get(i - 1, j) + weights.deletion,
                // insertion
                matrix.get(i, j - 1) + weights.insertion,
                // substitution
                matrix.get(i - 1, j - 1) + cost * weights.substitution,
            ];
            if (a[i] === b[j - 1] && a[i - 1] === b[j]) {
                // transposition
                distances.push(matrix.get(i - 2, j - 2) + cost * weights.transposition);
            }
            const minDistance = Math.min(...distances);
            matrix.set(minDistance, i, j);
            if (minDistance < rowMinDistance) {
                rowMinDistance = minDistance;
            }
        }
        if (rowMinDistance > threshold) {
            if (prevRowMinDistance > threshold) {
                return Infinity;
            }
            prevRowMinDistance = rowMinDistance;
        } else {
            prevRowMinDistance = -Infinity;
        }
    }

    const distance = matrix.get(a.length - 1, b.length - 1);
    if (distance > threshold) {
        return Infinity;
    }
    return distance;
}

type AlternativeWithEditDistance = readonly [value: string, distance: number];

/* c8 ignore start */
function compareAlternatives(a: AlternativeWithEditDistance, b: AlternativeWithEditDistance, target: string): number {
    const cmp = a[1] - b[1];
    if (cmp !== 0) {
        return cmp;
    }
    const aStartsWith = a[0].startsWith(target);
    const bStartsWith = b[0].startsWith(target);
    if (aStartsWith && !bStartsWith) {
        return -1;
    } else if (!aStartsWith && bStartsWith) {
        return 1;
    }
    return a[0].localeCompare(b[0]);
}
/* c8 ignore stop */

/**
 * @internal
 */
export function filterClosestAlternatives(
    target: string,
    alternatives: readonly string[],
    options: DamerauLevenshteinOptions,
): readonly string[] {
    const validAlternatives = alternatives
        .map<AlternativeWithEditDistance>((alt) => [alt, damerauLevenshtein(target, alt, options)])
        .filter(([, dist]) => dist <= options.threshold);
    const minDistance = Math.min(...validAlternatives.map(([, dist]) => dist));
    return validAlternatives
        .filter(([, dist]) => dist === minDistance)
        .sort((a, b) => compareAlternatives(a, b, target))
        .map(([alt]) => alt);
}
