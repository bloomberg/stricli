// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { type CommandContext, numberParser, text_en, type TypedCommandParameters } from "../../../src";
// eslint-disable-next-line no-restricted-imports
import { formatDocumentationForFlagParameters } from "../../../src/parameter/flag/formatting";
// eslint-disable-next-line no-restricted-imports
import type { HelpFormattingArguments } from "../../../src/routing/types";
import { compareToBaseline, StringArrayBaselineFormat } from "../../baseline";

describe("formatDocumentationForFlagParameters", function () {
    const defaultArgs: Omit<HelpFormattingArguments, "prefix"> = {
        includeVersionFlag: false,
        includeArgumentEscapeSequenceFlag: true,
        includeHelpAllFlag: false,
        includeHidden: false,
        config: {
            alwaysShowHelpAllFlag: false,
            caseStyle: "original",
            useAliasInUsageLine: false,
            onlyRequiredInUsageLine: false,
            disableAnsiColor: false,
        },
        text: text_en,
        ansiColor: true,
    };

    it("no flags", function () {
        // GIVEN
        type Positional = [];
        type Flags = {};

        const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
            flags: {},
            positional: { kind: "tuple", parameters: [] },
        };

        // WHEN
        const lines = formatDocumentationForFlagParameters(
            parameters.flags ?? {},
            parameters.aliases ?? {},
            defaultArgs,
        );

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    describe("boolean", function () {
        it("required boolean flag", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required boolean flag with default=false", function () {
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
                        default: false,
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required boolean flag with default=false, no ansi color", function () {
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
                        default: false,
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, {
                ...defaultArgs,
                ansiColor: false,
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required boolean flag with default=true", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional boolean flag", function () {
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
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("hidden optional boolean flag", function () {
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
                        hidden: true,
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("hidden optional boolean flag, help all", function () {
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
                        hidden: true,
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags ?? {}, parameters.aliases ?? {}, {
                ...defaultArgs,
                includeHidden: true,
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });
    });

    describe("enum", function () {
        it("required enum flag", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required enum flag with default", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional enum flag", function () {
            // GIVEN
            type Positional = [];
            type Flags = {
                readonly optionalEnum?: "a" | "b" | "c";
            };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    optionalEnum: {
                        kind: "enum",
                        values: ["a", "b", "c"],
                        optional: true,
                        brief: "optional enum flag",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional enum flag with default", function () {
            // GIVEN
            type Positional = [];
            type Flags = {
                readonly optionalEnum?: "a" | "b" | "c";
            };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    optionalEnum: {
                        kind: "enum",
                        values: ["a", "b", "c"],
                        optional: true,
                        default: "b",
                        brief: "optional enum flag",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });
    });

    describe("parsed", function () {
        it("required parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required parsed flag with alias", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required parsed flag with default", function () {
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
                        default: "",
                        brief: "required parsed flag",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required parsed flag with default [hidden]", function () {
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
                        default: "100",
                        brief: "required parsed flag",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required parsed flag with default [hidden], hide all", function () {
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
                        default: "100",
                        brief: "required parsed flag",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, {
                ...defaultArgs,
                includeHidden: true,
            });

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required parsed flag with default and alias", function () {
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
                        default: "100",
                        brief: "required parsed flag",
                    },
                },
                aliases: {
                    p: "requiredParsed",
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional parsed flag with alias", function () {
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
                aliases: {
                    p: "optionalParsed",
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required variadic parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional variadic parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("required array parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("optional array parsed flag", function () {
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
            const lines = formatDocumentationForFlagParameters(
                parameters.flags ?? {},
                parameters.aliases ?? {},
                defaultArgs,
            );

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });

        it("multiple parsed flags", function () {
            // GIVEN
            type Positional = [];
            type Flags = {
                readonly requiredParsed: string;
                readonly requiredParsedWithLongerName: string;
                readonly "required-parsed-with-kebab-case-name": string;
            };

            const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
                flags: {
                    requiredParsed: {
                        kind: "parsed",
                        parse: String,
                        brief: "required parsed flag",
                    },
                    requiredParsedWithLongerName: {
                        kind: "parsed",
                        parse: String,
                        brief: "required parsed flag with longer name",
                    },
                    "required-parsed-with-kebab-case-name": {
                        kind: "parsed",
                        parse: String,
                        brief: "required parsed flag with kebab-case name",
                    },
                },
                positional: { kind: "tuple", parameters: [] },
            };

            // WHEN
            const lines = formatDocumentationForFlagParameters(parameters.flags, parameters.aliases ?? {}, defaultArgs);

            // THEN
            compareToBaseline(this, StringArrayBaselineFormat, lines);
        });
    });
});
