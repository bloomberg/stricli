// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export function stripAnsiCodes(str: string): string {
    return str.replace(/\x1B\[[0-9;]*m/g, "");
}
