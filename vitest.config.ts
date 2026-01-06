// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: false,
        include: ["tests/**/*.spec.ts"],
        setupFiles: ["tests/snapshot-serializers.ts"],
        coverage: {
            provider: "v8",
            thresholds: {
                "100": true,
            },
        },
    },
});
