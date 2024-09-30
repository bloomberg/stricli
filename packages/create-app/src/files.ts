// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export const gitignoreText = `\
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
node_modules/
jspm_packages/

*.tsbuildinfo
dist
`;

export const localContextText = `\
import type { CommandContext } from "@stricli/core";

export interface LocalContext extends CommandContext {
  readonly process: NodeJS.Process;
  // ...
}

export function buildContext(process: NodeJS.Process): LocalContext {
  return {
    process,
  };
}
`;

export const localContextWithAutoCompleteText = `\
import type { CommandContext } from "@stricli/core";
import type { StricliAutoCompleteContext } from "@stricli/auto-complete";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface LocalContext extends CommandContext, StricliAutoCompleteContext {
  readonly process: NodeJS.Process;
  // ...
}

export function buildContext(process: NodeJS.Process): LocalContext {
  return {
    process,
    os,
    fs,
    path,
  };
}
`;

export const singleCommandImplText = `\
import type { LocalContext } from "./context";

interface CommandFlags {
  readonly count: number;
}

export default async function(this: LocalContext, flags: CommandFlags, name: string): Promise<void> {
  this.process.stdout.write(\`Hello \${name}!\\n\`.repeat(flags.count));
}
`;

export const singleCommandAppText = `\
import { buildApplication, buildCommand, numberParser } from "@stricli/core";
import { name, version, description } from "../package.json";

const command = buildCommand({
  loader: async () => import("./impl"),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [
        {
          brief: "Your name",
          parse: String,
        },
      ],
    },
    flags: {
      count: {
        kind: "parsed",
        brief: "Number of times to say hello",
        parse: numberParser,
      },
    },
  },
  docs: {
    brief: description,
  },
});

export const app = buildApplication(command, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
`;

export const multiCommandSubdirImplText = `\
import type { LocalContext } from "../../context";

interface SubdirCommandFlags {
  // ...
}

export default async function(this: LocalContext, flags: SubdirCommandFlags): Promise<void> {
  // ...
}
`;

export const multiCommandSubdirCommandText = `\
import { buildCommand } from "@stricli/core";

export const subdirCommand = buildCommand({
  loader: async () => import("./impl"),
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
  },
  docs: {
    brief: "Command in subdirectory",
  },
});
`;

export const multiCommandNestedImplText = `\
import type { LocalContext } from "../../context";

interface FooCommandFlags {
  // ...
}

export async function foo(this: LocalContext, flags: FooCommandFlags): Promise<void> {
  // ...
}

interface BarCommandFlags {
  // ...
}

export async function bar(this: LocalContext, flags: BarCommandFlags): Promise<void> {
  // ...
}
`;

export const multiCommandNestedCommandsText = `\
import { buildCommand, buildRouteMap } from "@stricli/core";

export const fooCommand = buildCommand({
  loader: async () => {
    const { foo } = await import("./impl");
    return foo;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
  },
  docs: {
    brief: "Nested foo command",
  },
});

export const barCommand = buildCommand({
  loader: async () => {
    const { bar } = await import("./impl");
    return bar;
  },
  parameters: {
    positional: {
      kind: "tuple",
      parameters: [],
    },
  },
  docs: {
    brief: "Nested bar command",
  },
});

export const nestedRoutes = buildRouteMap({
  routes: {
    foo: fooCommand,
    bar: barCommand,
  },
  docs: {
    brief: "Nested commands",
  },
});
`;

export const multiCommandAppText = `\
import { buildApplication, buildRouteMap } from "@stricli/core";
import { name, version, description } from "../package.json";
import { subdirCommand } from "./commands/subdir/command";
import { nestedRoutes } from "./commands/nested/commands";

const routes = buildRouteMap({
  routes: {
    subdir: subdirCommand,
    nested: nestedRoutes,
  },
  docs: {
    brief: description,
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
`;

export function buildMultiCommandAppWithAutoCompleteText(command: string, autcCommand: string): string {
    return `\
import { buildApplication, buildRouteMap } from "@stricli/core";
import { buildInstallCommand, buildUninstallCommand } from "@stricli/auto-complete";
import { name, version, description } from "../package.json";
import { subdirCommand } from "./commands/subdir/command";
import { nestedRoutes } from "./commands/nested/commands";

const routes = buildRouteMap({
  routes: {
    subdir: subdirCommand,
    nested: nestedRoutes,
    install: buildInstallCommand("${command}", { bash: "${autcCommand}" }),
    uninstall: buildUninstallCommand("${command}", { bash: true }),
  },
  docs: {
    brief: description,
    hideRoute: {
      install: true,
      uninstall: true,
    },
  },
});

export const app = buildApplication(routes, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
`;
}

export const binCliModuleText = `\
#!/usr/bin/env node
import { run } from "@stricli/core";
import { buildContext } from "../context";
import { app } from "../app";
await run(app, process.argv.slice(2), buildContext(process));
`;

export const binCliScriptText = `\
#!/usr/bin/env node
import { run } from "@stricli/core";
import { buildContext } from "../context";
import { app } from "../app";
void run(app, process.argv.slice(2), buildContext(process));
`;

export const binBashCompleteModuleText = `\
#!/usr/bin/env node
import { proposeCompletions } from "@stricli/core";
import { buildContext } from "../context";
import { app } from "../app";
const inputs = process.argv.slice(3);
if (process.env["COMP_LINE"]?.endsWith(" ")) {
  inputs.push("");
}
await proposeCompletions(app, inputs, buildContext(process));
`;

export const binBashCompleteScriptText = `\
#!/usr/bin/env node
import { proposeCompletions } from "@stricli/core";
import { buildContext } from "../context";
import { app } from "../app";
const inputs = process.argv.slice(3);
if (process.env["COMP_LINE"]?.endsWith(" ")) {
  inputs.push("");
}
void proposeCompletions(app, inputs, buildContext(process));
`;
