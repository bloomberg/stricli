// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { SnapshotSerializer } from "vitest";
import { FakeTerminal } from "../util/terminal";

export default {
    test(val: unknown) {
        // instanceof check fails when vitest loads serializer globally, as class is loaded twice
        return Boolean(val && typeof val === "object" && "__FakeTerminal" in val);
    },
    serialize(val: FakeTerminal) {
        return val.serialize();
    },
} satisfies SnapshotSerializer;
