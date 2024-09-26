#!/usr/bin/env node
import fs from "fs-extra";
import path from "node:path";
import url from "node:url";
const __dirname = url.fileURLToPath(new url.URL(".", import.meta.url));
const baselinesDir = path.join(__dirname, "..", "tests", "baselines");
fs.copySync(path.join(baselinesDir, "local"), path.join(baselinesDir, "reference"), { recursive: true });
