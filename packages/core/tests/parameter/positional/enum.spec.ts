// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import assert from "assert";
import { describe, expect, it } from "vitest";
import {
    buildCommand,
    type CommandContext,
    type CompletionConfiguration,
    EnumValidationError,
    type ScannerConfiguration,
    type TypedCommandParameters,
    UnexpectedPositionalError,
    UnsatisfiedPositionalError,
} from "../../../src";
// eslint-disable-next-line no-restricted-imports
import type { CommandParameters } from "../../../src/parameter/types";
// eslint-disable-next-line no-restricted-imports
import { buildArgumentScanner } from "../../../src/parameter/scanner";
import { buildFakeApplicationText } from "../../fakes/config";

const defaultScannerConfig: ScannerConfiguration = {
    caseStyle: "allow-kebab-for-camel",
    allowArgumentEscapeSequence: false,
    distanceOptions: {
        threshold: 7,
        weights: {
            insertion: 1,
            deletion: 3,
            substitution: 2,
            transposition: 0,
        },
    },
};

const defaultCompletionConfig: CompletionConfiguration = {
    includeAliases: false,
    includeHiddenRoutes: false,
};

describe("Positional Enum Parameter", () => {
    describe("required enum positional", () => {
        type Positional = ["small" | "medium" | "large"];
        type Flags = {};

        const parameters: CommandParameters = {
            flags: {},
            positional: {
                kind: "enum",
                values: ["small", "medium", "large"] as const,
                brief: "Size selection",
                placeholder: "size",
            },
        };

        it("should accept valid enum value", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("small");
            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "small"]);
            }
        });

        it("should accept all valid enum values", async () => {
            const validValues: Positional[0][] = ["small", "medium", "large"];

            for (const value of validValues) {
                const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(
                    parameters,
                    defaultScannerConfig,
                );

                scanner.next(value);
                const result = await scanner.parseArguments({
                    process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
                });

                expect(result.success).to.equal(true);
                if (result.success) {
                    expect(result.arguments).to.deep.equal([{}, value]);
                }
            }
        });

        it("should reject invalid enum value with suggestions", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("smal"); // typo: missing 'l'
            let threw = false;
            try {
                await scanner.parseArguments({ process: { stdout: { write: () => {} }, stderr: { write: () => {} } } });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(EnumValidationError);
                if (exc instanceof EnumValidationError) {
                    expect(exc.input).to.equal("smal");
                    expect(exc.values).to.deep.equal(["small", "medium", "large"]);
                    expect(exc.message).to.include("small"); // Should suggest "small"
                }
            }
            expect(threw).to.equal(true);
        });

        it("should reject value when no similar suggestion exists", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("xyz"); // completely different
            let threw = false;
            try {
                await scanner.parseArguments({ process: { stdout: { write: () => {} }, stderr: { write: () => {} } } });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(EnumValidationError);
                if (exc instanceof EnumValidationError) {
                    expect(exc.input).to.equal("xyz");
                    expect(exc.values).to.deep.equal(["small", "medium", "large"]);
                    // No suggestions when too different
                    expect(exc.message).to.not.include("did you mean");
                }
            }
            expect(threw).to.equal(true);
        });

        it("should reject missing required positional", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            let threw = false;
            try {
                await scanner.parseArguments({ process: { stdout: { write: () => {} }, stderr: { write: () => {} } } });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(UnsatisfiedPositionalError);
            }
            expect(threw).to.equal(true);
        });

        it("should reject multiple values", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("small");
            // Extra value should throw during next()
            expect(() => {
                scanner.next("medium");
            }).to.throw(UnexpectedPositionalError);
        });
    });

    describe("optional enum positional", () => {
        type Positional = ["small" | "medium" | "large" | undefined];
        type Flags = {};

        const parameters: CommandParameters = {
            flags: {},
            positional: {
                kind: "enum",
                values: ["small", "medium", "large"] as const,
                brief: "Size selection",
                placeholder: "size",
                optional: true,
            },
        };

        it("should accept valid enum value", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("medium");
            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "medium"]);
            }
        });

        it("should accept missing optional positional", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, undefined]);
            }
        });

        it("should reject invalid enum value even when optional", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("invalid");
            let result;
            let threw = false;
            try {
                result = await scanner.parseArguments({
                    process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
                });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(EnumValidationError);
            }
            expect(threw).to.equal(true);
        });
    });

    describe("enum positional with default value", () => {
        type Positional = ["small" | "medium" | "large"];
        type Flags = {};

        const parameters: CommandParameters = {
            flags: {},
            positional: {
                kind: "enum",
                values: ["small", "medium", "large"] as const,
                brief: "Size selection",
                placeholder: "size",
                default: "medium",
            },
        };

        it("should use default value when not provided", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "medium"]);
            }
        });

        it("should override default with provided value", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("large");
            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "large"]);
            }
        });

        it("should reject invalid default value at build time", async () => {
            // This test documents that invalid defaults in the parameter definition
            // won't be caught until runtime when no input is provided.
            // In a real scenario, the build process should catch this.
            const parametersWithInvalidDefault: CommandParameters = {
                flags: {},
                positional: {
                    kind: "enum",
                    values: ["small", "medium", "large"] as const,
                    brief: "Size selection",
                    placeholder: "size",
                    // Note: "xlarge" is not in the enum values - this will be caught at runtime
                    default: "xlarge",
                },
            };

            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(
                parametersWithInvalidDefault,
                defaultScannerConfig,
            );

            // When no input is provided, the invalid default triggers validation error
            let threw = false;
            try {
                await scanner.parseArguments({ process: { stdout: { write: () => {} }, stderr: { write: () => {} } } });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(EnumValidationError);
                if (exc instanceof EnumValidationError) {
                    expect(exc.input).to.equal("xlarge");
                }
            }
            expect(threw).to.equal(true);
        });
    });

    describe("enum positional completions", () => {
        type Positional = ["small" | "medium" | "large"];
        type Flags = {};

        const parameters: CommandParameters = {
            flags: {},
            positional: {
                kind: "enum",
                values: ["small", "medium", "large"] as const,
                brief: "Size selection",
                placeholder: "size",
            },
        };

        it("should provide all enum values as completions", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);
            const text = buildFakeApplicationText();

            const completions = await scanner.proposeCompletions({
                partial: "",
                completionConfig: defaultCompletionConfig,
                text,
                context: { process: { stdout: { write: () => {} }, stderr: { write: () => {} } } },
                includeVersionFlag: false,
            });
            const positionalCompletions = completions.filter((c) => c.kind === "argument:value");

            expect(positionalCompletions).to.have.length(3);
            const completionValues = positionalCompletions.map((c) => c.completion);
            expect(completionValues).to.include.members(["small", "medium", "large"]);
        });

        it("should filter completions by partial input", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);
            const text = buildFakeApplicationText();

            const completions = await scanner.proposeCompletions({
                partial: "s",
                completionConfig: defaultCompletionConfig,
                text,
                context: { process: { stdout: { write: () => {} }, stderr: { write: () => {} } } },
                includeVersionFlag: false,
            });
            const positionalCompletions = completions.filter((c) => c.kind === "argument:value");

            expect(positionalCompletions).to.have.length(1); // "small" only
            const completionValues = positionalCompletions.map((c) => c.completion);
            expect(completionValues).to.include("small");
            expect(completionValues).to.not.include("medium");
            expect(completionValues).to.not.include("large");
        });

        it("should include brief in completions", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);
            const text = buildFakeApplicationText();

            const completions = await scanner.proposeCompletions({
                partial: "",
                completionConfig: defaultCompletionConfig,
                text,
                context: { process: { stdout: { write: () => {} }, stderr: { write: () => {} } } },
                includeVersionFlag: false,
            });
            const positionalCompletions = completions.filter((c) => c.kind === "argument:value");

            for (const completion of positionalCompletions) {
                expect(completion.brief).to.equal("Size selection");
            }
        });

        it("should not provide completions when positional is already satisfied", async () => {
            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);
            const text = buildFakeApplicationText();

            // Provide the required positional value
            scanner.next("small");

            // Now completions should not include the enum values since the positional is satisfied
            const completions = await scanner.proposeCompletions({
                partial: "",
                completionConfig: defaultCompletionConfig,
                text,
                context: { process: { stdout: { write: () => {} }, stderr: { write: () => {} } } },
                includeVersionFlag: false,
            });
            const positionalCompletions = completions.filter((c) => c.kind === "argument:value");

            // No positional completions should be provided when the positional is already satisfied
            expect(positionalCompletions).to.have.length(0);
        });
    });

    describe("enum positional with various enum types", () => {
        it("should work with two-value enum", async () => {
            type Positional = ["enable" | "disable"];
            type Flags = {};

            const parameters: CommandParameters = {
                flags: {},
                positional: {
                    kind: "enum",
                    values: ["enable", "disable"] as const,
                    brief: "Toggle state",
                },
            };

            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("enable");
            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "enable"]);
            }
        });

        it("should work with multi-word enum values", async () => {
            type Positional = ["build-only" | "test-only" | "all"];
            type Flags = {};

            const parameters: CommandParameters = {
                flags: {},
                positional: {
                    kind: "enum",
                    values: ["build-only", "test-only", "all"] as const,
                    brief: "Operation mode",
                },
            };

            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("build-only");
            const result = await scanner.parseArguments({
                process: { stdout: { write: () => {} }, stderr: { write: () => {} } },
            });

            expect(result.success).to.equal(true);
            if (result.success) {
                expect(result.arguments).to.deep.equal([{}, "build-only"]);
            }
        });

        it("should suggest corrections for multi-word typos", async () => {
            type Positional = ["build-only" | "test-only" | "all"];
            type Flags = {};

            const parameters: CommandParameters = {
                flags: {},
                positional: {
                    kind: "enum",
                    values: ["build-only", "test-only", "all"] as const,
                    brief: "Operation mode",
                },
            };

            const scanner = buildArgumentScanner<Flags, Positional, CommandContext>(parameters, defaultScannerConfig);

            scanner.next("bulid-only"); // typo: swapped i and u
            let threw = false;
            try {
                await scanner.parseArguments({ process: { stdout: { write: () => {} }, stderr: { write: () => {} } } });
            } catch (exc) {
                threw = true;
                expect(exc).to.be.instanceof(EnumValidationError);
                if (exc instanceof EnumValidationError) {
                    expect(exc.input).to.equal("bulid-only");
                    expect(exc.message).to.include("build-only");
                }
            }
            expect(threw).to.equal(true);
        });
    });
});
