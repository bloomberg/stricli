#!/usr/bin/env node
import fse from "fs-extra";
import path from "node:path";
import url from "node:url";
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const baselinesDir = path.join(__dirname, "..", "tests", "baselines");
fse.copySync(path.join(baselinesDir, "local"), path.join(baselinesDir, "reference"), { recursive: true });
