// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "vitest";
import { describe, it } from "vitest";
import {
    AliasNotFoundError,
    buildApplication,
    buildCommand,
    buildRouteMap,
    numberParser,
    run,
    text_en,
    type CommandContext,
} from "../src";
import { buildFakeContext, type FakeContext } from "./fakes/context";
import { runResultSerializer } from "./snapshot-serializers";

// Register custom snapshot serializer
expect.addSnapshotSerializer(runResultSerializer);

interface TestRunResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | string | null | undefined;
}

async function runWithInputs(
    inputs: readonly string[],
    buildCommandFn: () => ReturnType<typeof buildCommand>,
    ...contextArgs: Parameters<typeof buildFakeContext>
): Promise<TestRunResult> {
    const command = buildCommandFn();
    const app = buildApplication(command, {
        name: "cli",
    });
    const context = buildFakeContext(...contextArgs);
    await run(app, inputs, context);
    return {
        stdout: context.process.stdout.write.args.map(([text]) => text).join(""),
        stderr: context.process.stderr.write.args.map(([text]) => text).join(""),
        exitCode: context.process.exitCode,
    };
}

describe("Alias Runtime Tests", () => {
    describe("Scenario 1: Valid aliases work at runtime", () => {
        it("should expand single character alias to full flag name", async () => {
            const result = await runWithInputs(
                ["-v"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: boolean }) => {
                                // Command executed successfully
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                verbose: {
                                    kind: "boolean",
                                    brief: "Enable verbose output",
                                },
                            },
                            aliases: {
                                v: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
                { forCommand: true, colorDepth: 4 },
            );

            // The command should execute successfully with verbose flag
            expect(result.exitCode).toBe(0);
        });

        it("should work with parsed flag alias", async () => {
            const result = await runWithInputs(
                ["-o", "output.txt"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { output: string }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                output: {
                                    kind: "parsed",
                                    brief: "Output file",
                                    parse: String,
                                },
                            },
                            aliases: {
                                o: "output",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should handle alias with equals syntax", async () => {
            const result = await runWithInputs(
                ["-o=output.txt"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { output: string }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                output: {
                                    kind: "parsed",
                                    brief: "Output file",
                                    parse: String,
                                },
                            },
                            aliases: {
                                o: "output",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should batch multiple boolean aliases", async () => {
            const result = await runWithInputs(
                ["-abc"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { alpha: boolean; bravo: boolean; charlie: boolean }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                alpha: { kind: "boolean", brief: "Alpha flag" },
                                bravo: { kind: "boolean", brief: "Bravo flag" },
                                charlie: { kind: "boolean", brief: "Charlie flag" },
                            },
                            aliases: {
                                a: "alpha",
                                b: "bravo",
                                c: "charlie",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 2: Invalid alias targets are handled gracefully", () => {
        it("should error at runtime when alias points to non-existent flag", async () => {
            const command = buildCommand({
                loader: async () => ({
                    default: () => {},
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                    aliases: {
                        x: "nonexistent",
                    } as never,
                },
                docs: { brief: "Test command" },
            });

            const app = buildApplication(command, {
                name: "cli",
            });

            const context = buildFakeContext({ forCommand: true, colorDepth: 4 });
            await run(app, ["-x"], context);

            // Should fail with invalid argument error
            expect(context.process.exitCode).toBe(-4);
            const stderr = context.process.stderr.write.args.map(([text]) => text).join("");
            expect(stderr).to.include("No flag registered");
        });

        it("should show helpful error for unknown alias at runtime", async () => {
            const result = await runWithInputs(
                ["-z"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: () => {},
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                verbose: { kind: "boolean", brief: "Verbose" },
                            },
                            aliases: {
                                v: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).not.toBe(0);
            expect(result.stderr).to.include("No alias registered for -z");
        });
    });

    describe("Scenario 3: Aliases work with different flag types", () => {
        it("should work with boolean flags", async () => {
            const result = await runWithInputs(
                ["-q"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { quiet: boolean }) => {
                                // Command executed
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                quiet: { kind: "boolean", brief: "Quiet mode" },
                            },
                            aliases: {
                                q: "quiet",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with parsed flags", async () => {
            const result = await runWithInputs(
                ["-n", "42"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { number: number }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                number: {
                                    kind: "parsed",
                                    brief: "Number flag",
                                    parse: numberParser,
                                },
                            },
                            aliases: {
                                n: "number",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with counter flags", async () => {
            const result = await runWithInputs(
                ["-vvv"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: number }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                verbose: {
                                    kind: "counter",
                                    brief: "Verbose level",
                                },
                            },
                            aliases: {
                                v: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with enum/choice flags", async () => {
            const result = await runWithInputs(
                ["-l", "debug"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { logLevel: "info" | "debug" | "error" }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                logLevel: {
                                    kind: "enum",
                                    values: ["info", "debug", "error"] as const,
                                    brief: "Log level",
                                },
                            },
                            aliases: {
                                l: "logLevel",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 4: Multiple aliases pointing to the same flag", () => {
        it("should support multiple aliases for the same flag", async () => {
            const result1 = await runWithInputs(
                ["-v"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: boolean }) => {},
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                verbose: { kind: "boolean", brief: "Verbose" },
                            },
                            aliases: {
                                v: "verbose",
                                V: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result1.exitCode).toBe(0);

            const result2 = await runWithInputs(
                ["-V"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: boolean }) => {},
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                verbose: { kind: "boolean", brief: "Verbose" },
                            },
                            aliases: {
                                v: "verbose",
                                V: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result2.exitCode).toBe(0);
        });
    });

    describe("Scenario 5: Aliases with negated boolean flags", () => {
        it("should handle aliases with boolean flag", async () => {
            const result = await runWithInputs(
                ["-c"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { colorOutput: boolean }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                colorOutput: {
                                    kind: "boolean",
                                    brief: "Color output",
                                },
                            },
                            aliases: {
                                c: "colorOutput",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with negated form using full flag (camelCase)", async () => {
            const result = await runWithInputs(
                ["--noColorOutput"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { colorOutput: boolean }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                colorOutput: {
                                    kind: "boolean",
                                    brief: "Color output",
                                },
                            },
                            aliases: {
                                c: "colorOutput",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with negated form using kebab-case with allow-kebab-for-camel", async () => {
            const command = buildCommand({
                loader: async () => ({
                    default: (flags: { colorOutput: boolean }) => {
                        return;
                    },
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {
                        colorOutput: {
                            kind: "boolean",
                            brief: "Color output",
                        },
                    },
                    aliases: {
                        c: "colorOutput",
                    },
                },
                docs: { brief: "Test command" },
            });

            const app = buildApplication(command, {
                name: "cli",
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
            });

            const context = buildFakeContext({ forCommand: true, colorDepth: 4 });
            await run(app, ["--no-color-output"], context);

            expect(context.process.exitCode).toBe(0);
        });
    });

    describe("Scenario 6: Aliases in nested commands/route maps", () => {
        it("should work with aliases in nested route maps", async () => {
            const subCommand = buildCommand({
                loader: async () => ({
                    default: (flags: { verbose: boolean }) => {},
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {
                        verbose: { kind: "boolean", brief: "Verbose" },
                    },
                    aliases: {
                        v: "verbose",
                    },
                },
                docs: { brief: "Sub command" },
            });

            const routeMap = buildRouteMap({
                routes: {
                    sub: subCommand,
                },
                docs: { brief: "Test route map" },
            });

            const app = buildApplication(routeMap, {
                name: "cli",
            });

            const context = buildFakeContext({ forCommand: true, colorDepth: 4 });
            await run(app, ["sub", "-v"], context);

            expect(context.process.exitCode).toBe(0);
        });

        it("should handle aliases at different nesting levels", async () => {
            const leafCommand = buildCommand({
                loader: async () => ({
                    default: (flags: { verbose: boolean; debug: boolean }) => {},
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {
                        verbose: { kind: "boolean", brief: "Verbose" },
                        debug: { kind: "boolean", brief: "Debug" },
                    },
                    aliases: {
                        v: "verbose",
                        d: "debug",
                    },
                },
                docs: { brief: "Leaf command" },
            });

            const innerRouteMap = buildRouteMap({
                routes: {
                    leaf: leafCommand,
                },
                docs: { brief: "Inner route map" },
            });

            const outerRouteMap = buildRouteMap({
                routes: {
                    inner: innerRouteMap,
                },
                docs: { brief: "Outer route map" },
            });

            const app = buildApplication(outerRouteMap, {
                name: "cli",
            });

            const context = buildFakeContext({ forCommand: true, colorDepth: 4 });
            await run(app, ["inner", "leaf", "-v", "-d"], context);

            expect(context.process.exitCode).toBe(0);
        });
    });

    describe("Scenario 7: Aliases with variadic flags", () => {
        it("should work with variadic parsed flags", async () => {
            const result = await runWithInputs(
                ["-f", "file1.txt", "-f", "file2.txt"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { files: string[] }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                files: {
                                    kind: "parsed",
                                    brief: "Input files",
                                    parse: String,
                                    variadic: true,
                                },
                            },
                            aliases: {
                                f: "files",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work with variadic flags using custom separator", async () => {
            const result = await runWithInputs(
                ["-n", "1,2,3"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { numbers: number[] }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                numbers: {
                                    kind: "parsed",
                                    brief: "Numbers",
                                    parse: numberParser,
                                    variadic: ",",
                                },
                            },
                            aliases: {
                                n: "numbers",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 8: Edge cases and special characters", () => {
        it("should reject reserved alias -h", async () => {
            expect(() =>
                buildCommand({
                    loader: async () => ({
                        default: () => {},
                    }),
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            hotel: { kind: "boolean", brief: "Hotel" },
                        },
                        aliases: {
                            h: "hotel",
                        } as never,
                    },
                    docs: { brief: "Test command" },
                }),
            ).to.throw("Unable to use reserved alias -h");
        });

        it("should reject reserved alias -H", async () => {
            expect(() =>
                buildCommand({
                    loader: async () => ({
                        default: () => {},
                    }),
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            hotel: { kind: "boolean", brief: "Hotel" },
                        },
                        aliases: {
                            H: "hotel",
                        } as never,
                    },
                    docs: { brief: "Test command" },
                }),
            ).to.throw("Unable to use reserved alias -H");
        });

        it("should reject reserved alias -v when version info is provided", async () => {
            const command = buildCommand({
                loader: async () => ({
                    default: (flags: { verbose: boolean }) => {},
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {
                        verbose: { kind: "boolean", brief: "Verbose" },
                    },
                    aliases: {
                        v: "verbose",
                    },
                },
                docs: { brief: "Test command" },
            });

            expect(() =>
                buildApplication(command, {
                    name: "cli",
                    versionInfo: {
                        currentVersion: "1.0.0",
                    },
                }),
            ).to.throw("Unable to use command with alias -v as root when version info is supplied");
        });

        it("should allow -v alias when no version info is provided", async () => {
            const command = buildCommand({
                loader: async () => ({
                    default: (flags: { verbose: boolean }) => {},
                }),
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {
                        verbose: { kind: "boolean", brief: "Verbose" },
                    },
                    aliases: {
                        v: "verbose",
                    },
                },
                docs: { brief: "Test command" },
            });

            expect(() =>
                buildApplication(command, {
                    name: "cli",
                }),
            ).not.to.throw();
        });

        it("should handle uppercase alias", async () => {
            const result = await runWithInputs(
                ["-V"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { versionFlag: boolean }) => {},
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                versionFlag: { kind: "boolean", brief: "Version flag" },
                            },
                            aliases: {
                                V: "versionFlag",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should handle single character aliases case sensitively", async () => {
            const result = await runWithInputs(
                ["-a", "-B"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { alpha: boolean; bravo: boolean }) => {},
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                alpha: { kind: "boolean", brief: "Alpha" },
                                bravo: { kind: "boolean", brief: "Bravo" },
                            },
                            aliases: {
                                a: "alpha",
                                B: "bravo",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 9: Aliases with optional flags", () => {
        it("should work with optional parsed flag via alias", async () => {
            const result = await runWithInputs(
                ["-o", "value"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { optional?: string }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                optional: {
                                    kind: "parsed",
                                    brief: "Optional flag",
                                    parse: String,
                                    optional: true,
                                },
                            },
                            aliases: {
                                o: "optional",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should work when optional flag alias is not provided", async () => {
            const result = await runWithInputs(
                [],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { optional?: string }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                optional: {
                                    kind: "parsed",
                                    brief: "Optional flag",
                                    parse: String,
                                    optional: true,
                                },
                            },
                            aliases: {
                                o: "optional",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 10: Aliases with default values", () => {
        it("should use default value when alias is not provided", async () => {
            const result = await runWithInputs(
                [],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { count: number }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                count: {
                                    kind: "parsed",
                                    brief: "Count",
                                    parse: numberParser,
                                    default: "5",
                                },
                            },
                            aliases: {
                                c: "count",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should override default value when alias is provided", async () => {
            const result = await runWithInputs(
                ["-c", "10"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { count: number }) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: { kind: "tuple", parameters: [] },
                            flags: {
                                count: {
                                    kind: "parsed",
                                    brief: "Count",
                                    parse: numberParser,
                                    default: "5",
                                },
                            },
                            aliases: {
                                c: "count",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });

    describe("Scenario 11: Combining aliases with positional arguments", () => {
        it("should handle aliases before positional arguments", async () => {
            const result = await runWithInputs(
                ["-v", "arg1", "arg2"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: boolean }, arg1: string, arg2: string) => {
                                return;
                            },
                        }),
                        parameters: {
                            positional: {
                                kind: "tuple",
                                parameters: [
                                    { brief: "First arg", parse: String },
                                    { brief: "Second arg", parse: String },
                                ],
                            },
                            flags: {
                                verbose: { kind: "boolean", brief: "Verbose" },
                            },
                            aliases: {
                                v: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });

        it("should handle aliases after positional arguments", async () => {
            const result = await runWithInputs(
                ["arg1", "arg2", "-v"],
                () =>
                    buildCommand({
                        loader: async () => ({
                            default: (flags: { verbose: boolean }, arg1: string, arg2: string) => {},
                        }),
                        parameters: {
                            positional: {
                                kind: "tuple",
                                parameters: [
                                    { brief: "First arg", parse: String },
                                    { brief: "Second arg", parse: String },
                                ],
                            },
                            flags: {
                                verbose: { kind: "boolean", brief: "Verbose" },
                            },
                            aliases: {
                                v: "verbose",
                            },
                        },
                        docs: { brief: "Test command" },
                    }),
            );

            expect(result.exitCode).toBe(0);
        });
    });
});
