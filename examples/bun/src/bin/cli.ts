#!/usr/bin/env node
import { run } from "@stricli/core";
import { app } from "../app.ts";
await run(app, process.argv.slice(2), { process });
