// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { defineConfig } from "vitest/config";
import config from "../../vitest.config";

export default defineConfig({
    ...config,
    test: {
        ...config.test,
    },
});
