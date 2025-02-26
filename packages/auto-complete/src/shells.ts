// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import bash from "./shells/bash";
import type { ShellAutoCompleteSupport } from "./types";

export default {
    bash,
} satisfies Record<string, ShellAutoCompleteSupport>;
