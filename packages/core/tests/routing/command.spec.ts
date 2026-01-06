// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    ExitCode,
    booleanParser,
    buildCommand,
    numberParser,
    text_en,
    type Command,
    type CommandContext,
} from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { HelpFormattingArguments } from "../../src/routing/types";
import { buildFakeContext } from "../fakes/context";
// eslint-disable-next-line no-restricted-imports
import { runCommand, type CommandRunArguments } from "../../src/routing/command/run";

export interface CommandRunResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | undefined;
}

async function runWithInputs(
    command: Command<CommandContext>,
    args: Omit<CommandRunArguments<CommandContext>, "context">,
): Promise<CommandRunResult> {
    const context = buildFakeContext();
    const exitCode = await runCommand(command, { context, ...args });
    return {
        stdout: context.process.stdout.write.args.map(([text]) => text).join(""),
        stderr: context.process.stderr.write.args.map(([text]) => text).join(""),
        exitCode,
    };
}

function compareHelpTextToBaseline(command: Command<CommandContext>, args: Omit<HelpFormattingArguments, "ansiColor">) {
    it("with ANSI color", () => {
        // WHEN
        const helpText = command.formatHelp({
            ...args,
            ansiColor: true,
        });

        // THEN
        expect(helpText).toMatchSnapshot();
    });

    it("no ANSI color", () => {
        // WHEN
        const helpText = command.formatHelp({
            ...args,
            ansiColor: false,
        });

        // THEN
        expect(helpText).toMatchSnapshot();
    });

    it("text with ANSI matches text without ANSI", () => {
        // WHEN
        const helpTextWithAnsiColor = command.formatHelp({
            ...args,
            ansiColor: true,
        });
        const helpTextWithAnsiColorStrippedOut = helpTextWithAnsiColor.replace(/\x1B\[[0-9;]*m/g, "");
        const helpTextWithoutAnsiColor = command.formatHelp({
            ...args,
            ansiColor: false,
        });

        // THEN
        expect(helpTextWithAnsiColorStrippedOut).to.deep.equal(helpTextWithoutAnsiColor);
    });
}

describe("Command", () => {
    describe("buildCommand", () => {
        it("fails with reserved flag --help", () => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { help: boolean }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            help: {
                                brief: "help flag brief",
                                kind: "boolean",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw("Unable to use reserved flag --help");
        });

        it("fails with reserved alias -h", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { hotel: boolean }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            hotel: {
                                brief: "hotel flag brief",
                                kind: "boolean",
                            },
                        },
                        aliases: {
                            h: "hotel",
                        } as {},
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw("Unable to use reserved alias -h");
        });

        it("fails with required boolean flag negated name collision", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { verbose: boolean; noVerbose: boolean }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            verbose: {
                                brief: "verbose flag brief",
                                kind: "boolean",
                            },
                            noVerbose: {
                                brief: "colliding flag",
                                kind: "boolean",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw("Unable to allow negation for --verbose as it conflicts with --noVerbose");
        });

        it("fails with required boolean flag negated name, camelCase", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { forceBuild: boolean; "no-force-build": boolean }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            forceBuild: {
                                brief: "flag brief",
                                kind: "boolean",
                            },
                            "no-force-build": {
                                brief: "colliding flag",
                                kind: "boolean",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw("Unable to allow negation for --forceBuild as it conflicts with --no-force-build");
        });

        it("fails with required boolean flag negated name, kebab-case", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { verbose: boolean; "no-verbose": boolean }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            verbose: {
                                brief: "verbose flag brief",
                                kind: "boolean",
                            },
                            "no-verbose": {
                                brief: "colliding flag",
                                kind: "boolean",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw("Unable to allow negation for --verbose as it conflicts with --no-verbose");
        });

        it("fails with invalid variadic flag separator (empty)", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { numbers: number[] }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            numbers: {
                                brief: "numbers flag brief",
                                kind: "parsed",
                                parse: numberParser,
                                variadic: "",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw('Unable to use "" as variadic separator for --numbers as it is empty');
        });

        it("fails with invalid variadic flag separator (contains whitespace)", (context) => {
            expect(() => {
                // WHEN
                buildCommand({
                    loader: async () => {
                        return {
                            default: (flags: { numbers: number[] }) => {},
                        };
                    },
                    parameters: {
                        positional: { kind: "tuple", parameters: [] },
                        flags: {
                            numbers: {
                                brief: "numbers flag brief",
                                kind: "parsed",
                                parse: numberParser,
                                variadic: "| |",
                            },
                        },
                    },
                    docs: { brief: "brief" },
                });
            }).to.throw('Unable to use "| |" as variadic separator for --numbers as it contains whitespace');
        });
    });

    describe("printHelp", () => {
        const defaultArgs: HelpFormattingArguments = {
            prefix: ["prefix"],
            aliases: [],
            config: {
                alwaysShowHelpAllFlag: false,
                caseStyle: "original",
                useAliasInUsageLine: false,
                onlyRequiredInUsageLine: false,
                disableAnsiColor: true,
            },
            text: text_en,
            includeVersionFlag: false,
            includeArgumentEscapeSequenceFlag: false,
            includeHelpAllFlag: false,
            includeHidden: false,
            ansiColor: false,
        };

        describe("no parameters", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: {}) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("no parameters, dropped empty flag spec", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: {}) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("no parameters, dropped empty positional spec", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: {}) => {},
                    };
                },
                parameters: {},
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("no parameters, dropped empty specs", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: {}) => {},
                    };
                },
                parameters: {},
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("no parameters, help all, force alias in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: {}) => {},
                    };
                },
                parameters: {},
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                includeHelpAllFlag: true,
                config: {
                    ...defaultArgs.config,
                    useAliasInUsageLine: true,
                },
            });
        });

        describe("mixed parameters", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters with version available", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, { ...defaultArgs, includeVersionFlag: true });
        });

        describe("mixed parameters with version available, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                includeVersionFlag: true,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters with aliases", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
            });
        });

        describe("mixed parameters with aliases, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("multiple boolean flags", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { alpha: boolean; bravo?: boolean; charlie: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "boolean",
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "boolean",
                            optional: true,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        c: "charlie",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("multiple boolean flags, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { alpha: boolean; bravo?: boolean; charlie: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "boolean",
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "boolean",
                            optional: true,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        c: "charlie",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("multiple boolean flags, kebab-case", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { alpha: boolean; bravo?: boolean; charlie: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "boolean",
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "boolean",
                            optional: true,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        c: "charlie",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                },
            });
        });

        describe("multiple boolean flags, kebab-case, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: { alpha: boolean; bravo?: boolean; charlie: boolean }) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "boolean",
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "boolean",
                            optional: true,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        c: "charlie",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters, full description", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                    fullDescription: "Longer description of this command's behavior, only printed during --help",
                },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters, full description, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                    fullDescription: "Longer description of this command's behavior, only printed during --help",
                },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters, custom usage", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                    customUsage: ["custom usage line #1", "custom usage line #2"],
                },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters, enhanced custom usage", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                    customUsage: [
                        {
                            input: "-a 1",
                            brief: "enhanced usage line #1",
                        },
                        {
                            input: "-a 2 -d",
                            brief: "enhanced usage line #2",
                        },
                    ],
                },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters, mixed custom usage", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                    customUsage: [
                        {
                            input: "-a 1",
                            brief: "enhanced usage line #1",
                        },
                        "normal custom usage A",
                        "normal custom usage B",
                        {
                            input: "-a 2 -d",
                            brief: "enhanced usage line #2",
                        },
                        "normal custom usage C",
                        "normal custom usage D",
                    ],
                },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters with `original` display case style", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alphaFlag: number; bravoFlag: number[]; charlieFlag?: number; deltaFlag: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alphaFlag: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravoFlag: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlieFlag: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        deltaFlag: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alphaFlag",
                        d: "deltaFlag",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters with `original` display case style, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alphaFlag: number; bravoFlag: number[]; charlieFlag?: number; deltaFlag: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alphaFlag: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravoFlag: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlieFlag: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        deltaFlag: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alphaFlag",
                        d: "deltaFlag",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters with `convert-camel-to-kebab` display case style", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alphaFlag: number; bravoFlag: number[]; charlieFlag?: number; deltaFlag: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alphaFlag: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravoFlag: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlieFlag: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        deltaFlag: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alphaFlag",
                        d: "deltaFlag",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                },
            });
        });

        describe("mixed parameters with `convert-camel-to-kebab` display case style, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alphaFlag: number; bravoFlag: number[]; charlieFlag?: number; deltaFlag: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alphaFlag: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravoFlag: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlieFlag: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        deltaFlag: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alphaFlag",
                        d: "deltaFlag",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters with custom headers", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
                text: {
                    ...defaultArgs.text,
                    headers: {
                        ...defaultArgs.text.headers,
                        usage: "Usage:",
                        aliases: "Aliases:",
                        flags: "Flags:",
                        arguments: "Arguments:",
                    },
                },
            });
        });

        describe("mixed parameters with custom headers, only required in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            arg0: string,
                            arg1?: number,
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "first argument brief",
                                parse: (x) => x,
                            },
                            {
                                brief: "second argument brief",
                                optional: true,
                                parse: numberParser,
                            },
                        ],
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: { brief: "brief" },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
                text: {
                    ...defaultArgs.text,
                    headers: {
                        ...defaultArgs.text.headers,
                        usage: "Usage:",
                        aliases: "Aliases:",
                        flags: "Flags:",
                        arguments: "Arguments:",
                    },
                },
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });
        });

        describe("mixed parameters, skips hidden", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            hidden: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            hidden: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                },
            });

            compareHelpTextToBaseline(command, defaultArgs);
        });

        describe("mixed parameters, force include hidden", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            hidden: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            hidden: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                includeHidden: true,
            });
        });

        describe("mixed parameters, help all, force alias in usage line", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (
                            flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
                            ...args: string[]
                        ) => {},
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "string array brief",
                            parse: (x) => x,
                        },
                    },
                    flags: {
                        alpha: {
                            brief: "alpha flag brief",
                            kind: "parsed",
                            parse: numberParser,
                        },
                        bravo: {
                            brief: "bravo flag brief",
                            kind: "parsed",
                            variadic: true,
                            parse: numberParser,
                        },
                        charlie: {
                            brief: "charlie flag brief",
                            placeholder: "c",
                            kind: "parsed",
                            optional: true,
                            parse: numberParser,
                        },
                        delta: {
                            brief: "delta flag brief",
                            kind: "boolean",
                        },
                    },
                    aliases: {
                        a: "alpha",
                        d: "delta",
                    },
                },
                docs: {
                    brief: "brief",
                },
            });

            compareHelpTextToBaseline(command, {
                ...defaultArgs,
                includeHelpAllFlag: true,
                config: {
                    ...defaultArgs.config,
                    useAliasInUsageLine: true,
                },
            });
        });
    });

    describe("run", () => {
        const defaultArgs: Omit<CommandRunArguments<CommandContext>, "context"> = {
            inputs: [],
            errorFormatting: text_en,
            scannerConfig: {
                caseStyle: "original",
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
            },
            documentationConfig: {
                alwaysShowHelpAllFlag: false,
                caseStyle: "original",
                onlyRequiredInUsageLine: false,
                useAliasInUsageLine: false,
                disableAnsiColor: true,
            },
        };

        describe("doNothing (loader returns function)", () => {
            const command = buildCommand({
                loader: async () => {
                    return (flags: Record<string, never>) => {};
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            it("no inputs", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input argument", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input flag", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["--foo"] });
                expect(result).toMatchSnapshot();
            });
        });

        describe("doNothing", () => {
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: Record<string, never>) => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            it("no inputs", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input argument", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input argument, with ansi color", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: ["foo"],
                });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input flag", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["--foo"] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected input flag, with ansi color", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: ["--foo"],
                });
                expect(result).toMatchSnapshot();
            });
        });

        describe("echoArguments", () => {
            const command = buildCommand({
                loader: async () => {
                    return {
                        default(this: CommandContext, _flags: {}, ...args: string[]) {
                            this.process.stdout.write(args.map((arg) => String(arg)).join("\n"));
                        },
                    };
                },
                parameters: {
                    positional: {
                        kind: "array",
                        parameter: {
                            brief: "",
                            parse: (x) => x,
                        },
                    },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            it("no inputs", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                expect(result).toMatchSnapshot();
            });

            it("single input argument", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                expect(result).toMatchSnapshot();
            });

            it("multiple input arguments", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo", "bar"] });
                expect(result).toMatchSnapshot();
            });

            it("unexpected error", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    inputs: [
                        {
                            toString() {
                                throw new Error("Unexpected error thrown by input");
                            },
                        } as any,
                    ],
                });
                expect(result).toMatchSnapshot();
            });

            it("unexpected error, with ansi color", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: [
                        {
                            toString() {
                                throw new Error("Unexpected error thrown by input");
                            },
                        } as any,
                    ],
                });
                expect(result).toMatchSnapshot();
            });
        });

        it("fails to scan missing flags", async () => {
            const command = buildCommand<{ foo: string; bar: string }, []>({
                loader: async () => {
                    throw new Error("This should not be reached by this test");
                },
                parameters: {
                    flags: {
                        foo: {
                            kind: "parsed",
                            brief: "brief",
                            parse: String,
                        },
                        bar: {
                            kind: "parsed",
                            brief: "brief",
                            parse: String,
                        },
                    },
                },
                docs: { brief: "brief" },
            });

            const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
            expect(result).toMatchSnapshot();
        });

        it("fails to scan missing flags, with ansi color", async () => {
            const command = buildCommand<{ foo: string; bar: string }, []>({
                loader: async () => {
                    throw new Error("This should not be reached by this test");
                },
                parameters: {
                    flags: {
                        foo: {
                            kind: "parsed",
                            brief: "brief",
                            parse: String,
                        },
                        bar: {
                            kind: "parsed",
                            brief: "brief",
                            parse: String,
                        },
                    },
                },
                docs: { brief: "brief" },
            });

            const result = await runWithInputs(command, {
                ...defaultArgs,
                documentationConfig: {
                    ...defaultArgs.documentationConfig,
                    disableAnsiColor: false,
                },
                inputs: [],
            });
            expect(result).toMatchSnapshot();
        });

        it("fails to parse invalid parameter", async () => {
            const command = buildCommand<{}, [boolean]>({
                loader: async () => {
                    throw new Error("This should not be reached by this test");
                },
                parameters: {
                    positional: {
                        kind: "tuple",
                        parameters: [
                            {
                                brief: "",
                                parse: booleanParser,
                            },
                        ],
                    },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            const result = await runWithInputs(command, { ...defaultArgs, inputs: ["nope"] });
            expect(result).toMatchSnapshot();
        });

        it("fails to load command module", async () => {
            const command = buildCommand<{}, []>({
                loader: async () => {
                    throw new Error("This command load purposefully throws an error");
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
            expect(result).toMatchSnapshot();
        });

        it("fails to load command module, with ansi color", async () => {
            const command = buildCommand<{}, []>({
                loader: async () => {
                    throw new Error("This command load purposefully throws an error");
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            const result = await runWithInputs(command, {
                ...defaultArgs,
                documentationConfig: {
                    ...defaultArgs.documentationConfig,
                    disableAnsiColor: false,
                },
                inputs: [],
            });
            expect(result).toMatchSnapshot();
        });

        describe("command function throws error", () => {
            class ErrorWithoutStack extends Error {
                override stack = void 0;
            }
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: unknown): never => {
                            throw new ErrorWithoutStack("This action purposefully throws an error");
                        },
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            it("with default exit code", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                expect(result).toMatchSnapshot();
            });

            it("with default exit code, ansi color", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: [],
                });
                expect(result).toMatchSnapshot();
            });

            it("with custom exit code", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    inputs: [],
                    determineExitCode: () => 10,
                });
                expect(result).toMatchSnapshot();
            });
        });

        describe("command function returns error", () => {
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: (flags: unknown): Error => {
                            return new Error("This action purposefully throws an error");
                        },
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });

            it("with default exit code", async () => {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                expect(result).toMatchSnapshot();
            });

            it("with default exit code, ansi color", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: [],
                });
                expect(result).toMatchSnapshot();
            });

            it("with custom exit code", async () => {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    inputs: [],
                    determineExitCode: () => 10,
                });
                expect(result).toMatchSnapshot();
            });
        });
    });
});
