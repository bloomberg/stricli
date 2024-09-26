// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { type CommandContext, numberParser, text_en, type TypedPositionalParameters } from "../../../src";
// eslint-disable-next-line no-restricted-imports
import { formatDocumentationForPositionalParameters } from "../../../src/parameter/positional/formatting";
// eslint-disable-next-line no-restricted-imports
import type { PositionalParameters } from "../../../src/parameter/positional/types";
// eslint-disable-next-line no-restricted-imports
import type { HelpFormattingArguments } from "../../../src/routing/types";
import { compareToBaseline, StringArrayBaselineFormat } from "../../baseline";

describe("formatDocumentationForPositionalParameters", function () {
    const defaultArgs: Pick<HelpFormattingArguments, "config" | "text" | "ansiColor"> = {
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

    it("tuple with no positional parameters", function () {
        // GIVEN
        type Positional = [];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one required positional parameter", function () {
        // GIVEN
        type Positional = [string];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "required positional parameter",
                    parse: String,
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one optional positional parameter", function () {
        // GIVEN
        type Positional = [string?];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "optional positional parameter",
                    parse: String,
                    optional: true,
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional as PositionalParameters, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one positional parameter with default", function () {
        // GIVEN
        type Positional = [string];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "required positional parameter",
                    parse: String,
                    default: "1001",
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one positional parameter with default, no ansi color", function () {
        // GIVEN
        type Positional = [string];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "required positional parameter",
                    parse: String,
                    default: "1001",
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, {
            ...defaultArgs,
            ansiColor: false,
        });

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one optional positional parameter with default", function () {
        // GIVEN
        type Positional = [string?];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "optional positional parameter",
                    parse: String,
                    default: "1001",
                    optional: true,
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional as PositionalParameters, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of one positional parameter with default, with alt text", function () {
        // GIVEN
        type Positional = [string];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "required positional parameter",
                    parse: String,
                    default: "1001",
                },
            ],
        };

        // WHEN
        const lines = Array.from(
            formatDocumentationForPositionalParameters(positional, {
                ...defaultArgs,
                text: {
                    ...defaultArgs.text,
                    keywords: {
                        ...defaultArgs.text.keywords,
                        default: "def =",
                    },
                },
            }),
        );

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("tuple of multiple positional parameters", function () {
        // GIVEN
        type Positional = [string, string, string];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [
                {
                    placeholder: "parsed",
                    brief: "required positional parameter",
                    parse: String,
                },
                {
                    placeholder: "parsedLonger",
                    brief: "required positional parameter with longer placeholder",
                    parse: String,
                },
                {
                    placeholder: "parsed-kebab-case",
                    brief: "required positional parameter with kebab-case placeholder",
                    parse: String,
                },
            ],
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });

    it("homogenous array of positional parameters", function () {
        // GIVEN
        type Positional = string[];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "array",
            parameter: {
                placeholder: "parsed",
                brief: "required positional parameter",
                parse: String,
            },
        };

        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional as PositionalParameters, defaultArgs);

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, lines);
    });
});
