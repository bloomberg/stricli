// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.spec.ts"],
        coverage: {
            provider: "v8",
            thresholds: {
                "100": true,
            },
        },
    },
});
