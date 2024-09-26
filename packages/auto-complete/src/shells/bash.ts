// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { StricliAutoCompleteContext } from "../context";
import type { ShellManager } from "../impl";
import nodeOs from "node:os";
import nodeFs from "node:fs";
import nodePath from "node:path";

function getBlockStartLine(targetCommand: string): string {
    return `# @stricli/auto-complete START [${targetCommand}]`;
}

const BLOCK_END_LINE = "# @stricli/auto-complete END";

export async function forBash(context: StricliAutoCompleteContext): Promise<ShellManager | undefined> {
    const { os = nodeOs, fs = nodeFs, path = nodePath } = context;
    if (!context.process.env["SHELL"]?.includes("bash")) {
        context.process.stderr.write(`Skipping bash as shell was not detected.\n`);
        return;
    }
    const home = os.homedir();
    const bashrc = path.join(home, ".bashrc");
    let lines: string[];
    try {
        const data = await fs.promises.readFile(bashrc);
        lines = data.toString().split(/\n/);
    } catch {
        context.process.stderr.write(`Expected to edit ~/.bashrc but file was not found.\n`);
        return;
    }
    return {
        install: async (targetCommand, autocompleteCommand) => {
            const startLine = getBlockStartLine(targetCommand);
            const startIndex = lines.indexOf(startLine);
            const bashFunctionName = `__${targetCommand}_complete`;
            const blockLines = [
                startLine,
                `${bashFunctionName}() { export COMP_LINE; COMPREPLY=( $(${autocompleteCommand} $COMP_LINE) ); return 0; }`,
                `complete -o default -o nospace -F ${bashFunctionName} ${targetCommand}`,
                BLOCK_END_LINE,
            ];
            if (startIndex >= 0) {
                const endIndex = lines.indexOf(BLOCK_END_LINE, startIndex);
                lines.splice(startIndex, endIndex - startIndex + 1, ...blockLines);
            } else {
                lines.push(...blockLines);
            }
            await fs.promises.writeFile(bashrc, lines.join("\n"));
            context.process.stdout.write(`Restart bash shell or run \`source ~/.bashrc\` to load changes.\n`);
        },
        uninstall: async (targetCommand) => {
            const startLine = getBlockStartLine(targetCommand);
            const startIndex = lines.indexOf(startLine);
            if (startIndex >= 0) {
                const endIndex = lines.indexOf(BLOCK_END_LINE, startIndex);
                lines.splice(startIndex, endIndex - startIndex + 1);
            }
            await fs.promises.writeFile(bashrc, lines.join("\n"));
            context.process.stdout.write(`Restart bash shell or run \`source ~/.bashrc\` to load changes.\n`);
        },
    };
}
