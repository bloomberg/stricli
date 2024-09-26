// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
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
import {
    StringArrayBaselineFormat,
    compareToBaseline,
    sanitizeStackTraceReferences,
    type BaselineFormat,
} from "../baseline";
import { buildFakeContext, type FakeContextOptions } from "../fakes/context";
// eslint-disable-next-line no-restricted-imports
import { runCommand, type CommandRunArguments } from "../../src/routing/command/run";

interface CommandRunResult {
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

function serializeExitCode(exitCode: number | undefined): string {
    const knownExitCode = Object.entries(ExitCode).find(([_, value]) => value === exitCode);
    if (knownExitCode) {
        return knownExitCode[0];
    }
    if (typeof exitCode === "number") {
        return `Unknown(${exitCode})`;
    }
    return "<<No exit code specified>>";
}

function parseExitCode(exitCodeText: string | undefined): number | undefined {
    if (!exitCodeText) {
        return;
    }
    const knownExitCode = Object.entries(ExitCode).find(([name]) => name === exitCodeText);
    if (knownExitCode) {
        return knownExitCode[1];
    }
    if (exitCodeText.startsWith("Unknown")) {
        return Number(exitCodeText.substring(8, exitCodeText.length - 1));
    }
}

const CommandRunResultBaselineFormat: BaselineFormat<CommandRunResult> = {
    *serialize(result) {
        yield `ExitCode=${serializeExitCode(result.exitCode)}`;
        yield ":: STDOUT";
        yield result.stdout;
        yield ":: STDERR";
        yield sanitizeStackTraceReferences(result.stderr);
    },
    parse(lines) {
        const exitCodeText = lines[0]!.split("=")[1];
        const exitCode = parseExitCode(exitCodeText);
        const stdoutStart = lines.indexOf(":: STDOUT");
        const stderrStart = lines.indexOf(":: STDERR");
        return {
            exitCode,
            stdout: lines.slice(stdoutStart + 1, stderrStart).join("\n"),
            stderr: lines.slice(stderrStart + 1).join("\n"),
        };
    },
    compare(actual, expected) {
        expect(actual.exitCode).to.deep.equal(expected.exitCode, "Application exited with unexpected exit code");
        expect(actual.stdout).to.deep.equal(expected.stdout, "Content of stdout did not match baseline");
        expect(actual.stderr).to.deep.equal(expected.stderr, "Content of stderr did not match baseline");
    },
};

describe("Command", function () {
    describe("buildCommand", function () {
        it("fails with reserved flag --help", function () {
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

        it("fails with reserved alias -h", function () {
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

        it("fails with required boolean flag negated name collision", function () {
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

        it("fails with required boolean flag negated name, camelCase", function () {
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

        it("fails with required boolean flag negated name, kebab-case", function () {
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
    });

    describe("printHelp", function () {
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

        it("no parameters", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("no parameters, dropped empty flag spec", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("no parameters, dropped empty positional spec", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("no parameters, dropped empty specs", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with version available", function () {
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

            // WHEN
            const helpString = command.formatHelp({ ...defaultArgs, includeVersionFlag: true });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with version available, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                includeVersionFlag: true,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with aliases", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with aliases, ansi color", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                ansiColor: true,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with aliases, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("multiple boolean flags", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("multiple boolean flags, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("multiple boolean flags, kebab-case", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("multiple boolean flags, kebab-case, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, full description", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, full description, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, custom usage", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with `original` display case style", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with `original` display case style, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with `convert-camel-to-kebab` display case style", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with `convert-camel-to-kebab` display case style, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                    onlyRequiredInUsageLine: true,
                },
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with custom headers", function () {
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

            // WHEN
            const helpString = command.formatHelp({
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

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters with custom headers, only required in usage line", function () {
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

            // WHEN
            const helpString = command.formatHelp({
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

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, skips hidden", function () {
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

            // WHEN
            const helpString = command.formatHelp(defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });

        it("mixed parameters, force include hidden", function () {
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

            // WHEN
            const helpString = command.formatHelp({
                ...defaultArgs,
                includeHidden: true,
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, helpString.split("\n"));
        });
    });

    describe("run", function () {
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

        describe("doNothing (loader returns function)", function () {
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

            it("no inputs", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input argument", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input flag", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["--foo"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });
        });

        describe("doNothing", function () {
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

            it("no inputs", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input argument", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input argument, with ansi color", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: ["foo"],
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input flag", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["--foo"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected input flag, with ansi color", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: ["--foo"],
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });
        });

        describe("echoArguments", function () {
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

            it("no inputs", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("single input argument", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("multiple input arguments", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: ["foo", "bar"] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected error", async function () {
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
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("unexpected error, with ansi color", async function () {
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
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });
        });

        it("fails to scan missing flags", async function () {
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
            compareToBaseline(this, CommandRunResultBaselineFormat, result);
        });

        it("fails to scan missing flags, with ansi color", async function () {
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
            compareToBaseline(this, CommandRunResultBaselineFormat, result);
        });

        it("fails to parse invalid parameter", async function () {
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
            compareToBaseline(this, CommandRunResultBaselineFormat, result);
        });

        it("fails to load command module", async function () {
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
            compareToBaseline(this, CommandRunResultBaselineFormat, result);
        });

        it("fails to load command module, with ansi color", async function () {
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
            compareToBaseline(this, CommandRunResultBaselineFormat, result);
        });

        describe("command function throws error", function () {
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

            it("with default exit code", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("with default exit code, ansi color", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: [],
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("with custom exit code", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    inputs: [],
                    determineExitCode: () => 10,
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });
        });

        describe("command function returns error", function () {
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

            it("with default exit code", async function () {
                const result = await runWithInputs(command, { ...defaultArgs, inputs: [] });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("with default exit code, ansi color", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    documentationConfig: {
                        ...defaultArgs.documentationConfig,
                        disableAnsiColor: false,
                    },
                    inputs: [],
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });

            it("with custom exit code", async function () {
                const result = await runWithInputs(command, {
                    ...defaultArgs,
                    inputs: [],
                    determineExitCode: () => 10,
                });
                compareToBaseline(this, CommandRunResultBaselineFormat, result);
            });
        });
    });
});
