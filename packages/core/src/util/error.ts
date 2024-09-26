// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export class InternalError extends Error {}

export function formatException(exc: unknown): string {
    if (exc instanceof Error) {
        return exc.stack ?? String(exc);
    }
    return String(exc);
}
