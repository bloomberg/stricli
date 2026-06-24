// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    type Application,
    buildApplication,
    buildCommand,
    type CommandContext,
    help,
    run,
    type StricliIntegration,
    text_en,
} from "../../src";
import { buildBasicCommand, buildBasicRouteMap, buildRouteMapForFakeContext } from "../application";
import { buildFakeContext } from "../fakes/context";
import { type ApplicationRunResult, runResultSerializer } from "../snapshot-serializers";

// Register custom snapshot serializers
expect.addSnapshotSerializer(runResultSerializer);

async function runWithInputs(
    app: Application<CommandContext>,
    inputs: readonly string[],
    ...args: Parameters<typeof buildFakeContext>
): Promise<ApplicationRunResult> {
    const context = buildFakeContext(...args);
    await run(app, inputs, context);
    return {
        stdout: context.process.stdout.write.args.map(([text]) => text).join(""),
        stderr: context.process.stderr.write.args.map(([text]) => text).join(""),
        exitCode: context.process.exitCode,
    };
}

describe("empty integration with no functionality", () => {
    describe("without help", () => {
        // GIVEN
        const root = buildBasicCommand();
        const integrations: Record<string, StricliIntegration<CommandContext>> = {
            empty: {},
        };
        const app = buildApplication(
            root,
            {
                name: "cli",
            },
            integrations,
        );

        // WHEN
        it("run empty command", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("help missing", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("with help", () => {
        // GIVEN
        const root = buildBasicCommand();
        const integrations: Record<string, StricliIntegration<CommandContext>> = {
            empty: {},
            help: help({
                brief: text_en.briefs.help,
                formatting: {
                    caseStyle: "original",
                    onlyRequiredInUsageLine: false,
                    useAliasInUsageLine: false,
                },
            }),
        };
        const app = buildApplication(
            root,
            {
                name: "cli",
            },
            integrations,
        );

        // WHEN
        it("has help text, without mentioning empty integration (no ansi color)", async () => {
            const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
            expect(result).toMatchSnapshot();
        });

        it("has help text, without mentioning empty integration", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });
    });
});

describe("integration with hook(s)", () => {
    const root = buildBasicCommand();
    const helpIntegration = help({
        brief: text_en.briefs.help,
        formatting: {
            caseStyle: "original",
            onlyRequiredInUsageLine: false,
            useAliasInUsageLine: false,
        },
    });

    describe("prints to stdout on every hook", () => {
        // GIVEN
        const integrations: Record<string, StricliIntegration<CommandContext>> = {
            help: helpIntegration,
            printsToStdout: {
                hooks: {
                    "app:start": function () {
                        this.process.stdout.write("app:start hook called\n");
                    },
                    "app:end": function () {
                        this.process.stdout.write("app:end hook called\n");
                    },
                    "command:start": function () {
                        this.process.stdout.write("command:start hook called\n");
                    },
                    "command:end": function () {
                        this.process.stdout.write("command:end hook called\n");
                    },
                },
            },
        };
        const app = buildApplication(
            root,
            {
                name: "cli",
            },
            integrations,
        );

        // WHEN
        it("run empty command", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("print help text, skips command hooks (no ansi color)", async () => {
            const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
            expect(result).toMatchSnapshot();
        });

        it("print help text, skips command hooks", async () => {
            const result = await runWithInputs(app, ["--help"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("throws errors", () => {
        describe("on app:start hook", () => {
            // GIVEN
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                help: helpIntegration,
                throwsErrors: {
                    hooks: {
                        "app:start": function () {
                            throw new Error("This is an expected error during app:start");
                        },
                    },
                },
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run empty command", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("print help text (skips command hooks)", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("on app:end hook", () => {
            // GIVEN
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                help: helpIntegration,
                throwsErrors: {
                    hooks: {
                        "app:end": function () {
                            throw new Error("This is an expected error during app:end");
                        },
                    },
                },
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run empty command", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("print help text (skips command hooks)", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("on command:start hook", () => {
            // GIVEN
            const root = buildBasicCommand();
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
                throwsErrors: {
                    hooks: {
                        "command:start": function () {
                            throw new Error("This is an expected error during command:start");
                        },
                    },
                },
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run empty command", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("print help text (skips command hooks)", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("on command:end hook", () => {
            // GIVEN
            const root = buildBasicCommand();
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
                throwsErrors: {
                    hooks: {
                        "command:end": function () {
                            throw new Error("This is an expected error during command:end");
                        },
                    },
                },
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run empty command", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("print help text (skips command hooks)", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });
});

describe("integration with flag", () => {
    describe("global flag", () => {
        const customIntegration: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: true,
                async run(this) {
                    this.process.stdout.write("customIntegration.run\n");
                },
            },
        };

        describe("without help", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run root", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("run root with flag", async () => {
                const result = await runWithInputs(app, ["--customIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at root", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("run command", async () => {
                const result = await runWithInputs(app, ["command"]);
                expect(result).toMatchSnapshot();
            });

            it("run command with flag", async () => {
                const result = await runWithInputs(app, ["command", "--customIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at command", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (default)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (allow-kebab-for-camel)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "convert-camel-to-kebab",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                    scanner: {
                        caseStyle: "allow-kebab-for-camel",
                    },
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("root-only flag", () => {
        const customIntegration: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                async run(this) {
                    this.process.stdout.write("customIntegration.run\n");
                },
            },
        };

        describe("without help", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run root", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("run root with flag", async () => {
                const result = await runWithInputs(app, ["--customIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at root", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("run command", async () => {
                const result = await runWithInputs(app, ["command"]);
                expect(result).toMatchSnapshot();
            });

            it("run command with flag (should fail)", async () => {
                const result = await runWithInputs(app, ["command", "--customIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at command", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (default)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (allow-kebab-for-camel)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "convert-camel-to-kebab",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                    scanner: {
                        caseStyle: "allow-kebab-for-camel",
                    },
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("root-only flag with matching subcommand flag", () => {
        const customIntegration: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                async run(this) {
                    this.process.stdout.write("customIntegration.run\n");
                },
            },
        };
        const command = buildCommand({
            async func({ matchingFlag }: { matchingFlag: boolean }) {
                this.process.stdout.write(`command.run (matchingFlag=${matchingFlag})\n`);
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    matchingFlag: {
                        brief: "flag that matches the root integration flag",
                        kind: "boolean",
                        default: false,
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });
        const root = buildRouteMapForFakeContext({
            routes: {
                command,
            },
            docs: {
                brief: "basic route map",
            },
        });

        describe("without help", () => {
            // GIVEN
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                matchingFlag: customIntegration,
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run root", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("run root with flag", async () => {
                const result = await runWithInputs(app, ["--matchingFlag"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at root", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("run command", async () => {
                const result = await runWithInputs(app, ["command"]);
                expect(result).toMatchSnapshot();
            });

            it("run command with flag (should pass through to command)", async () => {
                const result = await runWithInputs(app, ["command", "--matchingFlag"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at command", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (default)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                matchingFlag: customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        describe("with help (allow-kebab-for-camel)", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                matchingFlag: customIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "convert-camel-to-kebab",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                    scanner: {
                        caseStyle: "allow-kebab-for-camel",
                    },
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });

    describe("throws error on run", () => {
        const customIntegration: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                async run(this) {
                    throw new Error("This is an expected error from customIntegration.run");
                },
            },
        };

        // GIVEN
        const root = buildBasicRouteMap("basic route map");
        const integrations: Record<string, StricliIntegration<CommandContext>> = {
            customIntegration,
        };
        const app = buildApplication(
            root,
            {
                name: "cli",
            },
            integrations,
        );

        // WHEN
        it("run root (no ansi color)", async () => {
            const result = await runWithInputs(app, [], { colorDepth: 0 });
            expect(result).toMatchSnapshot();
        });

        it("run root", async () => {
            const result = await runWithInputs(app, []);
            expect(result).toMatchSnapshot();
        });

        it("run root with flag (no ansi color)", async () => {
            const result = await runWithInputs(app, ["--customIntegration"], { colorDepth: 0 });
            expect(result).toMatchSnapshot();
        });

        it("run root with flag", async () => {
            const result = await runWithInputs(app, ["--customIntegration"]);
            expect(result).toMatchSnapshot();
        });
    });

    describe("multiple flags with conflicting names", () => {
        const customIntegrationA: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                async run(this) {
                    this.process.stdout.write("customIntegrationA.run\n");
                },
            },
        };
        const customIntegrationB: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                async run(this) {
                    this.process.stdout.write("customIntegrationB.run\n");
                },
            },
        };
        const integrations: Record<string, StricliIntegration<CommandContext>> = {
            customIntegration: customIntegrationA,
            "custom-integration": customIntegrationB,
        };

        it("buildApplication succeeds for original case style", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");

            // WHEN
            buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );
        });

        it("fails at buildApplication with allow-kebab-for-camel case style", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");

            expect(() => {
                buildApplication(
                    root,
                    {
                        name: "cli",
                        scanner: {
                            caseStyle: "allow-kebab-for-camel",
                        },
                    },
                    integrations,
                );
            }).throws(
                `Multiple integrations are trying to use the same flag name (with 'allow-kebab-for-camel'): 'custom-integration' and 'customIntegration'`,
            );
        });
    });

    describe("multiple flags with conflicting aliases", () => {
        const customIntegrationA: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                aliases: ["c"],
                async run(this) {
                    this.process.stdout.write("customIntegrationA.run\n");
                },
            },
        };
        const customIntegrationB: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: false,
                global: false,
                aliases: ["c"],
                async run(this) {
                    this.process.stdout.write("customIntegrationB.run\n");
                },
            },
        };

        it("fails at buildApplication", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                customIntegrationA,
                customIntegrationB,
            };

            expect(() => {
                buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    integrations,
                );
            }).throws('Multiple integrations are trying to use the same flag alias "-c"');
        });
    });

    describe("default flag for route map", () => {
        const defaultRouteMapIntegration: StricliIntegration<CommandContext> = {
            flag: {
                brief: "This is a custom flag",
                defaultForRouteMap: true,
                global: false,
                async run(this) {
                    this.process.stdout.write("defaultRouteMapIntegration.run\n");
                },
            },
        };

        describe("without help", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                defaultRouteMapIntegration,
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("run root", async () => {
                const result = await runWithInputs(app, []);
                expect(result).toMatchSnapshot();
            });

            it("run root with flag", async () => {
                const result = await runWithInputs(app, ["--defaultRouteMapIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at root", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("run command", async () => {
                const result = await runWithInputs(app, ["command"]);
                expect(result).toMatchSnapshot();
            });

            it("run command with flag (should fail)", async () => {
                const result = await runWithInputs(app, ["command", "--defaultRouteMapIntegration"]);
                expect(result).toMatchSnapshot();
            });

            it("help missing at command", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });

        it("fails to build with (default) help", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                defaultRouteMapIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    defaultForRouteMap: true,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };

            // WHEN
            expect(() =>
                buildApplication(
                    root,
                    {
                        name: "cli",
                    },
                    integrations,
                ),
            ).to.throw(
                `Multiple integrations provide a default flag for route maps: 'defaultRouteMapIntegration' and 'help'`,
            );
        });

        describe("with (hidden) help", () => {
            // GIVEN
            const root = buildBasicRouteMap("basic route map");
            const integrations: Record<string, StricliIntegration<CommandContext>> = {
                defaultRouteMapIntegration,
                help: help({
                    brief: text_en.briefs.help,
                    hidden: true,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            };
            const app = buildApplication(
                root,
                {
                    name: "cli",
                },
                integrations,
            );

            // WHEN
            it("root has help text with integration", async () => {
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("command has help text with integration", async () => {
                const result = await runWithInputs(app, ["command", "--help"]);
                expect(result).toMatchSnapshot();
            });
        });
    });
});
