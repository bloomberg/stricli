// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { StricliAutoCompleteContext } from "../context";
import type { ShellManager } from "../impl";
import nodeOs from "node:os";
import nodeFs from "node:fs";
import nodePath from "node:path";

function getFilePath(targetCommand: string, completionsDir: string): string {
    return nodePath.join(completionsDir, `${targetCommand}.fish`);
}

const BLOCK_START_LINE = (targetCommand: string) =>
    `# @stricli/auto-complete START [${targetCommand}]`;
const BLOCK_END_LINE = "# @stricli/auto-complete END";

export async function forFish(
    context: StricliAutoCompleteContext
): Promise<ShellManager | undefined> {
    const { os = nodeOs, fs = nodeFs, path = nodePath } = context;
    if (!context.process.env["SHELL"]?.includes("fish")) {
        context.process.stderr.write(`Skipping fish as shell was not detected.\n`);
        return;
    }
    const home = os.homedir();
    const completionsDir = path.join(home, ".config", "fish", "completions");
    try {
        await fs.promises.mkdir(completionsDir, { recursive: true });
    } catch {
        context.process.stderr.write(
            `Could not create fish completions directory at ${completionsDir}.\n`
        );
        return;
    }
    return {
        install: async (targetCommand: string, autocompleteCommand: string) => {
            const filePath = getFilePath(targetCommand, completionsDir);
            const functionName = `__fish_${targetCommand}_complete`;
            // Create a fish completions file that defines a helper function and registers it.
            const fileContent = [
                BLOCK_START_LINE(targetCommand),
                `function ${functionName}`,
                `    # Get the current command line (as a single string)`,
                `    set -l cmd (commandline -cp)`,
                `    # Invoke the provided autocomplete command with the command line`,
                `    set -l completions ( ${autocompleteCommand} $cmd )`,
                `    for comp in $completions`,
                `        echo $comp`,
                `    end`,
                `end`,
                `complete -c ${targetCommand} -f -a "(${functionName})"`,
                BLOCK_END_LINE,
                "",
            ].join("\n");
            try {
                await fs.promises.writeFile(filePath, fileContent);
                context.process.stdout.write(
                    `Fish completions installed to ${filePath}. Restart fish shell or run 'source ${filePath}' to load changes.\n`
                );
            } catch {
                context.process.stderr.write(
                    `Failed to write fish completions file at ${filePath}.\n`
                );
            }
        },
        uninstall: async (targetCommand: string) => {
            const filePath = getFilePath(targetCommand, completionsDir);
            try {
                await fs.promises.unlink(filePath);
                context.process.stdout.write(
                    `Fish completions removed from ${filePath}. Restart fish shell or run 'source ${filePath}' to update changes.\n`
                );
            } catch {
                context.process.stderr.write(
                    `Could not remove fish completions file at ${filePath}.\n`
                );
            }
        },
    };
}
