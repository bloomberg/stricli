// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type { SnapshotSerializer } from "vitest";
import { FakeContext } from "./fakes/context";

// Serializer for FakeContext
export const fakeContextSerializer: SnapshotSerializer = {
    test(val: unknown): val is FakeContext {
        return typeof val === "object" && val instanceof FakeContext;
    },
    serialize(val: FakeContext): string {
        const lines: string[] = [];
        const { process, files } = val;
        lines.push("[STDOUT]");
        lines.push(process.stdout.write.args.flat().join(""));
        lines.push("[STDERR]");
        lines.push(process.stderr.write.args.flat().join(""));
        if (files.size > 0) {
            lines.push("[FILES]");
            for (const [path, text] of val.files) {
                lines.push(`:: ${path}`);
                lines.push(text);
            }
        }
        return lines.join("\n");
    },
};
