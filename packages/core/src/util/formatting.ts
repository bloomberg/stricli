// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
function maximum(arr1: readonly number[], arr2: readonly number[]): readonly number[] {
    const maxValues: number[] = [];
    const maxLength = Math.max(arr1.length, arr2.length);
    for (let i = 0; i < maxLength; ++i) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        maxValues[i] = Math.max(arr1[i]!, arr2[i]!);
    }
    return maxValues;
}

type CellRow = readonly string[];

/**
 * @internal
 */
export function formatRowsWithColumns(cells: readonly CellRow[], separators?: readonly string[]): readonly string[] {
    if (cells.length === 0) {
        return [];
    }
    const startingLengths = (Array(Math.max(...cells.map((cellRow) => cellRow.length))) as number[]).fill(0, 0);
    const maxLengths = cells.reduce<readonly number[]>((acc, cellRow) => {
        const lengths = cellRow.map((cell) => cell.length);
        return maximum(acc, lengths);
    }, startingLengths);
    return cells.map((cellRow) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstCell = (cellRow[0] ?? "").padEnd(maxLengths[0]!);
        return cellRow
            .slice(1)
            .reduce<readonly string[]>(
                (parts, str, i, arr) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const paddedStr = arr.length === i + 1 ? str : str.padEnd(maxLengths[i + 1]!);
                    return [...parts, separators?.[i] ?? " ", paddedStr];
                },
                [firstCell],
            )
            .join("")
            .trimEnd();
    });
}

interface ConjuctiveJoin {
    readonly kind: "conjunctive";
    readonly conjunction: string;
    readonly serialComma?: boolean;
}

/**
 * @internal
 */
export type JoinGrammar = ConjuctiveJoin;

/**
 * @internal
 */
export function joinWithGrammar(parts: readonly string[], grammar: JoinGrammar): string {
    if (parts.length <= 1) {
        return parts[0] ?? "";
    }
    if (parts.length === 2) {
        return parts.join(` ${grammar.conjunction} `);
    }
    let allButLast = parts.slice(0, parts.length - 1).join(", ");
    if (grammar.serialComma) {
        allButLast += ",";
    }
    return [allButLast, grammar.conjunction, parts[parts.length - 1]].join(" ");
}
