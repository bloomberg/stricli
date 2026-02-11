// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export class InternalError extends Error {}

/**
 * Formats an exception for display in error messages.
 * For Error objects, returns the stack trace if available.
 * For plain objects, returns a JSON string representation to preserve debugging info.
 * For other values, returns the string representation.
 */
export function formatException(exc: unknown): string {
    if (exc instanceof Error) {
        return exc.stack ?? String(exc);
    }
    if (typeof exc === "object" && exc !== null) {
        try {
            return JSON.stringify(exc);
        } catch {
            // Circular reference or non-serializable object
            return String(exc);
        }
    }
    return String(exc);
}
