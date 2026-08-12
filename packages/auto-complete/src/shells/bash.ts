// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { proposeCompletions } from "@stricli/core";
import nodeFs from "node:fs";
import nodeOs from "node:os";
import nodePath from "node:path";
import type { ShellAutoCompleteSupport } from "../types";
import { ErrorWithoutStack } from "../util/error";

function getBlockStartLine(targetCommand: string): string {
    return `# @stricli/auto-complete START [${targetCommand}]`;
}

const BLOCK_END_LINE = "# @stricli/auto-complete END";

export default {
    isCurrentShell(context) {
        return Boolean(context.process.env?.["SHELL"]?.includes("bash"));
    },
    generateScript(targetCommand, autocompleteCommand) {
        const bashFunctionName = `__${targetCommand}_complete`;
        const blockLines = [
            `${bashFunctionName}() { export COMP_LINE; COMPREPLY=( $(${autocompleteCommand} $COMP_LINE) ); return 0; }`,
            `complete -o default -o nospace -F ${bashFunctionName} ${targetCommand}`,
        ];
        return blockLines.join("\n");
    },
    isScriptActive(context) {
        return Boolean(context.process.env?.["COMP_LINE"]);
    },
    completeNextInput() {
        return this.process.env?.["COMP_LINE"]?.endsWith(" ") ?? false;
    },
    handleCompletions(completions) {
        for (const { completion } of completions) {
            this.process.stdout.write(`${completion}\n`);
        }
    },
    async getCommandManager({ os = nodeOs, fs = nodeFs, path = nodePath }) {
        const home = os.homedir();
        const bashrc = path.join(home, ".bashrc");
        let lines: string[];
        try {
            const data = await fs.promises.readFile(bashrc);
            lines = data.toString().split(/\n/);
        } catch {
            throw new ErrorWithoutStack("Expected to edit ~/.bashrc but unable to read file.");
        }
        return {
            installScriptForCommand: async (targetCommand, script) => {
                const startLine = getBlockStartLine(targetCommand);
                const startIndex = lines.indexOf(startLine);
                const blockLines = [
                    startLine,
                    script,
                    BLOCK_END_LINE,
                ];
                if (startIndex >= 0) {
                    const endIndex = lines.indexOf(BLOCK_END_LINE, startIndex);
                    lines.splice(startIndex, endIndex - startIndex + 1, ...blockLines);
                } else {
                    lines.push(...blockLines);
                }
                await fs.promises.writeFile(bashrc, lines.join("\n"));
                return `Restart bash shell or run \`source ~/.bashrc\` to load changes.`;
            },
            uninstallScriptForCommand: async (targetCommand) => {
                const startLine = getBlockStartLine(targetCommand);
                const startIndex = lines.indexOf(startLine);
                if (startIndex >= 0) {
                    const endIndex = lines.indexOf(BLOCK_END_LINE, startIndex);
                    lines.splice(startIndex, endIndex - startIndex + 1);
                }
                await fs.promises.writeFile(bashrc, lines.join("\n"));
                return `Restart bash shell or run \`source ~/.bashrc\` to load changes.`;
            },
        };
    },

} satisfies ShellAutoCompleteSupport;
