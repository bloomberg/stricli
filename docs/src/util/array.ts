// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

export function riffle<T>(arr: T[], newItem: (index: number) => T): readonly T[] {
    return arr.reduce<T[]>((result, item, i) => {
        result.push(item);
        if (i < arr.length - 1) {
            result.push(newItem(i));
        }
        return result;
    }, []);
}
