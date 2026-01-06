// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import { type CommandContext, text_en, type TypedPositionalParameters } from "../../../src";
// eslint-disable-next-line no-restricted-imports
import { formatDocumentationForPositionalParameters } from "../../../src/parameter/positional/formatting";
// eslint-disable-next-line no-restricted-imports
import type { PositionalParameters } from "../../../src/parameter/positional/types";
// eslint-disable-next-line no-restricted-imports
import type { HelpFormattingArguments } from "../../../src/routing/types";

type DocumentationArgs = Pick<HelpFormattingArguments, "config" | "text">;

function compareDocumentationToBaseline(positional: PositionalParameters, args: DocumentationArgs) {
    it("with ANSI color", () => {
        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, {
            ...args,
            ansiColor: true,
        });

        // THEN
        expect(lines).toMatchSnapshot();
    });

    it("no ANSI color", () => {
        // WHEN
        const lines = formatDocumentationForPositionalParameters(positional, {
            ...args,
            ansiColor: false,
        });

        // THEN
        expect(lines).toMatchSnapshot();
    });

    it("text with ANSI matches text without ANSI", () => {
        // WHEN
        const linesWithAnsiColor = formatDocumentationForPositionalParameters(positional, {
            ...args,
            ansiColor: true,
        });
        const linesWithAnsiColorStrippedOut = linesWithAnsiColor.map((line) => line.replace(/\x1B\[[0-9;]*m/g, ""));
        const linesWithoutAnsiColor = formatDocumentationForPositionalParameters(positional, {
            ...args,
            ansiColor: false,
        });

        // THEN
        expect(linesWithAnsiColorStrippedOut).to.deep.equal(linesWithoutAnsiColor);
    });
}

describe("formatDocumentationForPositionalParameters", () => {
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

    describe("tuple with no positional parameters", () => {
        // GIVEN
        type Positional = [];

        const positional: TypedPositionalParameters<Positional, CommandContext> = {
            kind: "tuple",
            parameters: [],
        };

        compareDocumentationToBaseline(positional, defaultArgs);
    });

    describe("tuple of one required positional parameter", () => {
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

        compareDocumentationToBaseline(positional, defaultArgs);
    });

    describe("tuple of one optional positional parameter", () => {
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

        compareDocumentationToBaseline(positional as PositionalParameters, defaultArgs);
    });

    describe("tuple of one positional parameter with default", () => {
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

        compareDocumentationToBaseline(positional, defaultArgs);
    });

    describe("tuple of one optional positional parameter with default", () => {
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

        compareDocumentationToBaseline(positional as PositionalParameters, defaultArgs);
    });

    describe("tuple of one positional parameter with default, with alt text", () => {
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

        compareDocumentationToBaseline(positional, {
            ...defaultArgs,
            text: {
                ...defaultArgs.text,
                keywords: {
                    ...defaultArgs.text.keywords,
                    default: "def =",
                },
            },
        });
    });

    describe("tuple of multiple positional parameters", () => {
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

        compareDocumentationToBaseline(positional, defaultArgs);
    });

    describe("homogenous array of positional parameters", () => {
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

        compareDocumentationToBaseline(positional as PositionalParameters, defaultArgs);
    });
});
