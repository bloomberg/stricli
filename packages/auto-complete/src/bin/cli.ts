#!/usr/bin/env node
// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { run } from "@stricli/core";
import { app } from "../app";
void run(app, process.argv.slice(2), globalThis);
