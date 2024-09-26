// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { groupBy } from "./array";

type PromiseAll<T extends readonly unknown[] | []> = { [P in keyof T]: T[P] | Promise<T[P]> };

interface MultiplePromiseRejectedResult {
    readonly status: "rejected";
    readonly reasons: readonly unknown[];
}

export type PromiseSettledOrElseResult<T> = PromiseFulfilledResult<T> | MultiplePromiseRejectedResult;

export async function allSettledOrElse<T extends readonly unknown[]>(
    values: PromiseAll<T>,
): Promise<PromiseSettledOrElseResult<T>> {
    const results = await Promise.allSettled(values);
    const grouped = groupBy(results, "status");
    if (grouped.rejected && grouped.rejected.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return { status: "rejected", reasons: grouped.rejected.map((result) => result.reason) };
    }

    return { status: "fulfilled", value: (grouped.fulfilled?.map((result) => result.value) ?? []) as unknown as T };
}
