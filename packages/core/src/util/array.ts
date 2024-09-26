// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-return */

export function group<T, K extends keyof any>(array: readonly T[], callback: (item: T) => K): Partial<Record<K, T[]>> {
    return array.reduce<Partial<Record<K, T[]>>>((groupings, item) => {
        const key = callback(item);
        const groupItems = groupings[key] ?? [];
        groupItems.push(item);
        groupings[key] = groupItems;
        return groupings;
    }, {});
}

type GroupsBySelector<S extends keyof any, T extends Record<S, any>> = {
    [K in T as K[S]]?: K[];
};

export function groupBy<S extends keyof any, T extends Record<S, any>>(
    array: readonly T[],
    selector: S,
): GroupsBySelector<S, T> {
    return group(array, (item) => item[selector]) as unknown as GroupsBySelector<S, T>;
}
