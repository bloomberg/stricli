// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { StricliIntegration } from "../integration";
import type { AvailableAlias } from "../../parameter/types";
import type { FormattingConfiguration } from "../../parameter/formatting";
import type { DisplayCaseStyle, ScannerCaseStyle } from "../../config";
import type { AdditionalFlag } from "../../routing/scanner";

/**
 * Options for customizing the behavior of the `help` integration.
 */
export type HelpIntegrationConfiguration = Omit<AdditionalFlag, "name" | "aliases" | "global"> & {
    /**
     * Single-character shorthand alias for this flag, defaults to `h` if not provided.
     * Set to `false` to disable the alias entirely.
     */
    readonly alias?: AvailableAlias | false;
    /**
     * When printing help text, if this flag is set to `true`, hidden flags and routes will be included in the output.
     * Defaults to `false`.
     */
    readonly includeHidden?: boolean;
    /**
     * Configuration for controlling how printed documentation is formatted.
     */
    readonly formatting: FormattingConfiguration;
};

/**
 * @internal
 */
export function validateCaseStyleCompatibility(scan: ScannerCaseStyle, display: DisplayCaseStyle): void {
    if (scan === "original" && display === "convert-camel-to-kebab") {
        throw new Error("Cannot convert route and flag names on display (convert-camel-to-kebab) but scan as original");
    }
}

/**
 * This integration provides a `--help` flag for all commands, which prints the help text for the command and exits.
 * It can be customized to provide different behavior; see {@link HelpIntegrationConfiguration} for configuration options.
 */
export function help<CONTEXT extends CommandContext>({
    alias = "h",
    includeHidden = false,
    formatting,
    ...config
}: HelpIntegrationConfiguration): StricliIntegration<CONTEXT> {
    return {
        validate(_root, config) {
            validateCaseStyleCompatibility(config.scanner.caseStyle, formatting.caseStyle);
        },
        flag: {
            ...config,
            defaultForRouteMap: !config.hidden,
            global: true,
            aliases: alias === false ? [] : [alias],
            async run(this, app, { text, ansiColorByStream, result, additionalFlags }) {
                this.process.stdout.write(
                    result.target.formatHelp({
                        prefix: result.prefix,
                        additionalFlags,
                        includeArgumentEscapeSequenceFlag: app.config.scanner.allowArgumentEscapeSequence,
                        includeHidden,
                        config: formatting,
                        aliases: result.aliases[formatting.caseStyle],
                        text,
                        ansiColor: ansiColorByStream.stdout,
                    }),
                );
            },
        },
    };
}
