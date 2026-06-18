import { script as tabScript } from "@bomb.sh/tab";

export type TabShell = "bash" | "zsh" | "fish" | "powershell";

const shells = new Set(["bash", "zsh", "fish", "powershell"]);

export interface ScriptFlags {
  readonly shell: TabShell;
  readonly command?: string;
}

export function parseShell(value: string): TabShell {
  if (!shells.has(value)) {
    throw new Error(
      `Unsupported shell "${value}". Expected bash, zsh, fish, or powershell.`,
    );
  }

  return value as TabShell;
}

export function printScript(
  flags: ScriptFlags,
  targetCommand: string,
): void {
  const completionCommand = flags.command ?? targetCommand;

  tabScript(flags.shell, targetCommand, completionCommand);
}