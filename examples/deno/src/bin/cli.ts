#!/usr/bin/env node
import { run } from "npm:@stricli/core@1.0.0";
import { app } from "../app.ts";
await run(app, process.argv.slice(2), { process });
