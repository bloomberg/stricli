// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, it } from "vitest";
import { buildChoiceParser, type CommandContext, numberParser, type TypedCommandParameters } from "../../src";
// eslint-disable-next-line no-restricted-imports
import { formatUsageLineForParameters, type UsageFormattingArguments } from "../../src/parameter/formatting";
// eslint-disable-next-line no-restricted-imports
import type { CommandParameters } from "../../src/parameter/types";
import { compareToBaseline, StringArrayBaselineFormat } from "../baseline";

describe("formatUsageLineForParameters", () => {
    const defaultArgs: UsageFormattingArguments = {
        prefix: ["cli"],
        config: {
            alwaysShowHelpAllFlag: false,
            caseStyle: "original",
            useAliasInUsageLine: false,
            onlyRequiredInUsageLine: false,
            disableAnsiColor: false,
        },
        ansiColor: true,
    };

    describe("positional parameters", () => {
        it("tuple with no positional parameters", (context) => {
            // GIVEN
            type Positional = [];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const line = formatUsageLineForParameters(parameters, defaultArgs);

            // THEN
            compareToBaseline(context, StringArrayBaselineFormat, [line]);
        });

        it("tuple of one required positional parameter", (context) => {
            // GIVEN
            type Positional = [string];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            placeholder: "parsed",
                            parse: String,
                            brief: "required positional parameter",
                        },
                    ],
                },
            };

            // WHEN
            const line = formatUsageLineForParameters(parameters, defaultArgs);

            // THEN
            compareToBaseline(context, StringArrayBaselineFormat, [line]);
        });

        it("tuple of one optional positional parameter", (context) => {
            // GIVEN
            type Positional = [string?];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            placeholder: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional positional parameter",
                        },
                    ],
                },
            };

            // WHEN
            const line = formatUsageLineForParameters(parameters as CommandParameters, defaultArgs);

            // THEN
            compareToBaseline(context, StringArrayBaselineFormat, [line]);
        });

        it("tuple of mixed positional parameters", (context) => {
            // GIVEN
            type Positional = [string, string?, string?];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            placeholder: "parsed",
                            parse: String,
                            brief: "required positional parameter",
                        },
                        {
                            placeholder: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional positional parameter",
                        },
                        {
                            placeholder: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional positional parameter",
                        },
                    ],
                },
            };

            // WHEN
            const line = formatUsageLineForParameters(parameters as CommandParameters, defaultArgs);

            // THEN
            compareToBaseline(context, StringArrayBaselineFormat, [line]);
        });

        it("homogenous array of positional parameters", (context) => {
            // GIVEN
            type Positional = string[];
            type Flags = {};

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {},
                positional: {
                    kind: "array",
                    parameter: {
                        placeholder: "parsed",
                        brief: "required positional parameter",
                        parse: String,
                    },
                },
            };

            // WHEN
            const line = formatUsageLineForParameters(parameters as CommandParameters, defaultArgs);

            // THEN
            compareToBaseline(context, StringArrayBaselineFormat, [line]);
        });
    });

    describe("flags", () => {
        describe("boolean", () => {
            it("required boolean flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredBoolean: boolean;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredBoolean: {
                            kind: "boolean",
                            brief: "required boolean flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required boolean flag with default", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredBoolean: boolean;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredBoolean: {
                            kind: "boolean",
                            brief: "required boolean flag",
                            default: true,
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional boolean flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalBoolean?: boolean;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalBoolean: {
                            kind: "boolean",
                            brief: "optional boolean flag",
                            optional: true,
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });
        });

        describe("enum", () => {
            it("required enum flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredEnum: "a" | "b" | "c";
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredEnum: {
                            kind: "enum",
                            values: ["a", "b", "c"],
                            brief: "required enum flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required enum flag with default", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredEnum: "a" | "b" | "c";
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredEnum: {
                            kind: "enum",
                            values: ["a", "b", "c"],
                            default: "b",
                            brief: "required enum flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional enum flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalEnum?: "a" | "b" | "c";
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalEnum: {
                            kind: "enum",
                            optional: true,
                            values: ["a", "b", "c"],
                            brief: "optional enum flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional enum flag with default", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalEnum?: "a" | "b" | "c";
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalEnum: {
                            kind: "enum",
                            optional: true,
                            values: ["a", "b", "c"],
                            default: "b",
                            brief: "optional enum flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });
        });

        describe("parsed", () => {
            it("required parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            brief: "required parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with unused alias", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            brief: "required parsed flag",
                        },
                    },
                    aliases: {
                        p: "requiredParsed",
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with no aliases", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            brief: "required parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, {
                    ...defaultArgs,
                    config: {
                        ...defaultArgs.config,
                        useAliasInUsageLine: true,
                    },
                });

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with alias", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            brief: "required parsed flag",
                        },
                    },
                    aliases: {
                        p: "requiredParsed",
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, {
                    ...defaultArgs,
                    config: {
                        ...defaultArgs.config,
                        useAliasInUsageLine: true,
                    },
                });

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with multiple aliases", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            brief: "required parsed flag",
                        },
                    },
                    aliases: {
                        p: "requiredParsed",
                        P: "requiredParsed",
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, {
                    ...defaultArgs,
                    config: {
                        ...defaultArgs.config,
                        useAliasInUsageLine: true,
                    },
                });

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with default", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            default: "1",
                            brief: "required parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required parsed flag with default [hidden]", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredParsed: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredParsed: {
                            kind: "parsed",
                            parse: String,
                            hidden: true,
                            default: "1",
                            brief: "required parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalParsed?: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalParsed: {
                            kind: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional parsed flag [hidden]", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalParsed?: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalParsed: {
                            kind: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional parsed flag",
                            hidden: true,
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional parsed flag with placeholder", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalParsed?: string;
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalParsed: {
                            kind: "parsed",
                            parse: String,
                            optional: true,
                            brief: "optional parsed flag",
                            placeholder: "parsed",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required variadic parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredVariadicParsed: string[];
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredVariadicParsed: {
                            kind: "parsed",
                            parse: String,
                            variadic: true,
                            brief: "required variadic parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional variadic parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalVariadicParsed?: string[];
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalVariadicParsed: {
                            kind: "parsed",
                            parse: String,
                            optional: true,
                            variadic: true,
                            brief: "optional variadic parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("required array parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly requiredArrayParsed: string[];
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        requiredArrayParsed: {
                            kind: "parsed",
                            parse: (values) => values.split(","),
                            brief: "required array parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });

            it("optional array parsed flag", (context) => {
                // GIVEN
                type Positional = [];
                type Flags = {
                    readonly optionalArrayParsed?: string[];
                };

                const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                    flags: {
                        optionalArrayParsed: {
                            kind: "parsed",
                            parse: (values) => values.split(","),
                            optional: true,
                            brief: "optional array parsed flag",
                        },
                    },
                    positional: { kind: "tuple", parameters: [] },
                };

                // WHEN
                const line = formatUsageLineForParameters(parameters, defaultArgs);

                // THEN
                compareToBaseline(context, StringArrayBaselineFormat, [line]);
            });
        });
    });
});
