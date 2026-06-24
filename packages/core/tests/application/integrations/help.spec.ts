// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    buildApplication,
    buildCommand,
    help,
    run,
    text_en,
    type Application,
    type CommandContext
} from "../../../src";
import { buildFakeContext } from "../../fakes/context";
import { runResultSerializer, type ApplicationRunResult } from "../../snapshot-serializers";

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

function buildCommandForFormattingTests() {
    return buildCommand({
        func: async (flags: { camelCase: boolean; alias: boolean; optional?: string }) => {},
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [],
            },
            flags: {
                camelCase: {
                    brief: "camelCase",
                    kind: "boolean",
                },
                alias: {
                    brief: "alias",
                    kind: "boolean",
                },
                optional: {
                    brief: "optional",
                    kind: "parsed",
                    parse: String,
                    optional: true,
                },
            },
            aliases: {
                a: "alias",
            },
        },
        docs: {
            brief: "basic command",
        },
    });
}

describe("help integration", () => {
    describe("via config (default integration)", () => {
        const command = buildCommandForFormattingTests();

        describe("default config", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });

            it("alias, with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-h"]);
                expect(result).toMatchSnapshot();
            });

            it("alias, no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-h"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("useAliasInUsageLine is true", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
                documentation: {
                    useAliasInUsageLine: true,
                },
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("onlyRequiredInUsageLine is true", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
                documentation: {
                    onlyRequiredInUsageLine: true,
                },
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("caseStyle converts to kebab when allowed for scan", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
                documentation: {
                    caseStyle: "convert-camel-to-kebab",
                },
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        it("fails when caseStyle converts to kebab but scan is original", () => {
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    scanner: {
                        caseStyle: "original",
                    },
                    documentation: {
                        caseStyle: "convert-camel-to-kebab",
                    },
                }),
            ).to.throw('Cannot convert route and flag names on display (convert-camel-to-kebab) but scan as original');
        });
    });

    describe("via integration args", () => {
        const command = buildCommandForFormattingTests();

        describe("default config", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("useAliasInUsageLine is true", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: true,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("onlyRequiredInUsageLine is true", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: true,
                        useAliasInUsageLine: false,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("caseStyle converts to kebab when allowed for scan", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "convert-camel-to-kebab",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        it("fails when caseStyle converts to kebab but scan is original", () => {
            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    scanner: {
                        caseStyle: "original",
                    },
                }, {
                help: help({
                    brief: text_en.briefs.help,
                    formatting: {
                        caseStyle: "convert-camel-to-kebab",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            }),
            ).to.throw('Cannot convert route and flag names on display (convert-camel-to-kebab) but scan as original');
        });

        describe("no alias", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    alias: false,
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });

            it("alias, with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-h"]);
                expect(result).toMatchSnapshot();
            });

            it("alias, no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-h"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });

        describe("non-standard alias", () => {
            // GIVEN
            const app = buildApplication(command, {
                name: "cli",
            }, {
                help: help({
                    brief: text_en.briefs.help,
                    alias: "H",
                    formatting: {
                        caseStyle: "original",
                        onlyRequiredInUsageLine: false,
                        useAliasInUsageLine: false,
                    },
                }),
            });

            it("with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"]);
                expect(result).toMatchSnapshot();
            });

            it("no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["--help"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });

            it("alias, with ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-H"]);
                expect(result).toMatchSnapshot();
            });

            it("alias, no ansi color", async () => {
                // WHEN
                const result = await runWithInputs(app, ["-H"], { colorDepth: 0 });
                expect(result).toMatchSnapshot();
            });
        });
    });
});
