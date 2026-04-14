// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type { SnapshotSerializer } from "vitest";
import { type DocumentedCommand } from "../../src";

export default {
    test(val: unknown): val is readonly DocumentedCommand[] {
        return (
            Array.isArray(val) &&
            val.length > 0 &&
            Array.isArray(val[0]) &&
            val[0].length === 2 &&
            typeof val[0][0] === "string" &&
            typeof val[0][1] === "string"
        );
    },
    serialize(val: readonly DocumentedCommand[]): string {
        const lines: string[] = [];
        for (const route of val) {
            lines.push(`:: ${route[0]}`);
            lines.push(...route[1].split("\n"));
        }
        return lines.join("\n");
    },
} satisfies SnapshotSerializer;
