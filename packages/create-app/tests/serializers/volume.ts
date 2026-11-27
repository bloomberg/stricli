// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { Volume } from "memfs";
import type { SnapshotSerializer } from "vitest";

export default {
    test(val: unknown) {
        return val instanceof Volume;
    },
    serialize(val: Volume) {
        return Object.entries(val.toJSON())
            .filter(([, entry]) => entry !== null)
            .map(([path, text]) => {
                return `:::: ${path}\n${text}`;
            })
            .join("\n");
    },
} satisfies SnapshotSerializer;
