// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildCommand, buildRouteMap, type Application } from "@stricli/core";
import path from "node:path/posix";
import sinon from "sinon";
import { describe, it, expect } from "vitest";
import { handleCompletionsForShell, type StricliAutoCompleteContext } from "../src";
import { buildFakeContext } from "./fakes/context";
// eslint-disable-next-line no-restricted-imports
import bash from "../src/shells/bash";

function buildBasicCommand() {
    return buildCommand({
        func: async () => {},
        parameters: {},
        docs: {
            brief: "basic command",
        },
    });
}

function buildBasicRouteMap(commands: string[]) {
    return buildRouteMap({
        routes: Object.fromEntries(commands.map((command) => [command, buildBasicCommand()])),
        docs: {
            brief: "basic route map",
        },
    });
}

describe("bash", () => {
    describe("isShellActive", () => {
        it("no env vars", async () => {
            // WHEN
            const context = buildFakeContext({
                env: {},
            });
            const active = await bash.isShellActive(context);

            // THEN
            expect(active).to.equal(false);
        });

        it("SHELL env var empty", async () => {
            // WHEN
            const context = buildFakeContext({
                env: {
                    SHELL: "",
                },
            });
            const active = await bash.isShellActive(context);

            // THEN
            expect(active).to.equal(false);
        });

        it("SHELL env var contains bash", async () => {
            // WHEN
            const context = buildFakeContext({
                env: {
                    SHELL: "bash",
                },
            });
            const active = await bash.isShellActive(context);

            // THEN
            expect(active).to.equal(true);
        });

        it("SHELL env var contains sh", async () => {
            // WHEN
            const context = buildFakeContext({
                env: {
                    SHELL: "sh",
                },
            });
            const active = await bash.isShellActive(context);

            // THEN
            expect(active).to.equal(false);
        });
    });

    describe("getCommandManager", () => {
        it("fails if missing .bashrc", async () => {
            // GIVEN
            const readFile = async () => {
                throw new Error("File not found");
            };
            const writeFile = sinon.fake();

            // WHEN
            const context = buildFakeContext({
                env: {},
                os: {
                    homedir: () => "~",
                },
                path,
                fs: {
                    promises: {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                        readFile: readFile as any,
                        writeFile,
                    },
                },
            });
            await bash.getCommandManager(context).then(
                () => {
                    throw new Error("Expected getCommandManager to throw");
                },
                (exc: unknown) => {
                    // THEN
                    expect(exc instanceof Error);
                    expect(exc).to.have.property("message", "Expected to edit ~/.bashrc but unable to read file.");
                },
            );
        });

        describe("install", () => {
            it("empty .bashrc", async () => {
                // GIVEN
                const bashrc = "";
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.install("TARGET", "AUTOCOMPLETE");

                // THEN
                expect(writeFile.args).to.deep.equal([
                    [
                        "~/.bashrc",
                        [
                            "",
                            "# @stricli/auto-complete START [TARGET]",
                            "__TARGET_complete() { export COMP_LINE; COMPREPLY=( $(AUTOCOMPLETE $COMP_LINE) ); return 0; }",
                            "complete -o default -o nospace -F __TARGET_complete TARGET",
                            "# @stricli/auto-complete END",
                        ].join("\n"),
                    ],
                ]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });

            it("edits existing section", async () => {
                // GIVEN
                const bashrc = [
                    "# start of .bashrc",
                    "",
                    "# @stricli/auto-complete START [TARGET]",
                    "# PREVIOUS CONTENT, TO BE REPLACED",
                    "# @stricli/auto-complete END",
                    "",
                    "# end of .bashrc",
                ].join("\n");
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.install("TARGET", "AUTOCOMPLETE");

                // THEN
                expect(writeFile.args).to.deep.equal([
                    [
                        "~/.bashrc",
                        [
                            "# start of .bashrc",
                            "",
                            "# @stricli/auto-complete START [TARGET]",
                            "__TARGET_complete() { export COMP_LINE; COMPREPLY=( $(AUTOCOMPLETE $COMP_LINE) ); return 0; }",
                            "complete -o default -o nospace -F __TARGET_complete TARGET",
                            "# @stricli/auto-complete END",
                            "",
                            "# end of .bashrc",
                        ].join("\n"),
                    ],
                ]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });

            it("appends to file, ignoring other target section", async () => {
                // GIVEN
                const bashrc = [
                    "# start of .bashrc",
                    "",
                    "# @stricli/auto-complete START [OTHER]",
                    "# INSTALLATION FOR OTHER TARGET",
                    "# @stricli/auto-complete END",
                    "",
                    "# end of .bashrc",
                ].join("\n");
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.install("TARGET", "AUTOCOMPLETE");

                // THEN
                expect(writeFile.args).to.deep.equal([
                    [
                        "~/.bashrc",
                        [
                            "# start of .bashrc",
                            "",
                            "# @stricli/auto-complete START [OTHER]",
                            "# INSTALLATION FOR OTHER TARGET",
                            "# @stricli/auto-complete END",
                            "",
                            "# end of .bashrc",
                            "# @stricli/auto-complete START [TARGET]",
                            "__TARGET_complete() { export COMP_LINE; COMPREPLY=( $(AUTOCOMPLETE $COMP_LINE) ); return 0; }",
                            "complete -o default -o nospace -F __TARGET_complete TARGET",
                            "# @stricli/auto-complete END",
                        ].join("\n"),
                    ],
                ]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });
        });

        describe("uninstall", () => {
            it("empty .bashrc", async () => {
                // GIVEN
                const bashrc = "";
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.uninstall("TARGET");

                // THEN
                expect(writeFile.args).to.deep.equal([["~/.bashrc", [""].join("\n")]]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });

            it("removes existing section", async () => {
                // GIVEN
                const bashrc = [
                    "# start of .bashrc",
                    "",
                    "# @stricli/auto-complete START [TARGET]",
                    "# PREVIOUS CONTENT, TO BE REMOVED",
                    "# @stricli/auto-complete END",
                    "",
                    "# end of .bashrc",
                ].join("\n");
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.uninstall("TARGET");

                // THEN
                expect(writeFile.args).to.deep.equal([
                    ["~/.bashrc", ["# start of .bashrc", "", "", "# end of .bashrc"].join("\n")],
                ]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });

            it("removes existing section, ignoring other target section", async () => {
                // GIVEN
                const bashrc = [
                    "# start of .bashrc",
                    "",
                    "# @stricli/auto-complete START [OTHER]",
                    "# INSTALLATION FOR OTHER TARGET",
                    "# @stricli/auto-complete END",
                    "",
                    "# @stricli/auto-complete START [TARGET]",
                    "# PREVIOUS CONTENT, TO BE REMOVED",
                    "# @stricli/auto-complete END",
                    "",
                    "# end of .bashrc",
                ].join("\n");
                const readFile = async () => bashrc;
                const writeFile = sinon.fake();

                // WHEN
                const context = buildFakeContext({
                    env: {},
                    os: {
                        homedir: () => "~",
                    },
                    path,
                    fs: {
                        promises: {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                            readFile: readFile as any,
                            writeFile,
                        },
                    },
                });
                const manager = await bash.getCommandManager(context);
                const message = await manager.uninstall("TARGET");

                // THEN
                expect(writeFile.args).to.deep.equal([
                    [
                        "~/.bashrc",
                        [
                            "# start of .bashrc",
                            "",
                            "# @stricli/auto-complete START [OTHER]",
                            "# INSTALLATION FOR OTHER TARGET",
                            "# @stricli/auto-complete END",
                            "",
                            "",
                            "# end of .bashrc",
                        ].join("\n"),
                    ],
                ]);
                expect(message).to.equal("Restart bash shell or run `source ~/.bashrc` to load changes.");
            });
        });
    });

    describe("handleCompletions", () => {
        it("prints flag suggestions for multi-command app", async () => {
            // GIVEN
            const root = buildCommand({
                func: async (flags: { foo: boolean; bar: boolean; baz: boolean }) => {},
                parameters: {
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo flag",
                        },
                        bar: {
                            kind: "boolean",
                            brief: "bar flag",
                        },
                        baz: {
                            kind: "boolean",
                            brief: "baz flag",
                        },
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });
            const app = buildApplication(root, {
                name: "run",
            });

            // WHEN
            const context = buildFakeContext({
                env: {
                    COMP_LINE: `${app.config.name} `,
                },
            });
            await handleCompletionsForShell("bash", app, [], context);

            // THEN
            expect(context.process.stdout.write.args.flat()).to.deep.equal(["--foo\n", "--bar\n", "--baz\n"]);
        });

        it("prints command suggestions for multi-command app", async () => {
            // GIVEN
            const root = buildBasicRouteMap(["foo", "bar", "baz"]);
            const app = buildApplication(root, {
                name: "run",
            });

            // WHEN
            const context = buildFakeContext({
                env: {
                    COMP_LINE: `${app.config.name} `,
                },
            });
            await handleCompletionsForShell("bash", app, [], context);

            // THEN
            expect(context.process.stdout.write.args.flat()).to.deep.equal(["foo\n", "bar\n", "baz\n"]);
        });

        it("ignores errors", async () => {
            // GIVEN
            const app = {} as Application<StricliAutoCompleteContext>;

            // WHEN
            const context = buildFakeContext({
                env: {
                    COMP_LINE: `run `,
                },
            });
            await handleCompletionsForShell("bash", app, [], context);

            // THEN
            expect(context.process.stdout.write.args.flat()).to.deep.equal([]);
        });
    });
});
