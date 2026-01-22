// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import bash from "./shells/bash";
import type { ShellAutoCompleteSupport } from "./types";

export const shells = {
    bash,
} satisfies Record<string, ShellAutoCompleteSupport>;

export type Shell = keyof typeof shells;
