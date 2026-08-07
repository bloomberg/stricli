// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { DisplayCaseStyle, ScannerCaseStyle } from "../../config";
import { checkEnvironmentVariable, type CommandContext } from "../../context";
import type { FormattingConfiguration } from "../../parameter/formatting";
import type { AvailableAlias } from "../../parameter/types";
import type { ApplicationFlag, StricliIntegration } from "../integration";

/**
 * Options for customizing the behavior of the `help` integration.
 */
export type HelpIntegrationConfiguration = Omit<
    ApplicationFlag<CommandContext>,
    "name" | "aliases" | "global" | "run"
> & {
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
    /**
     * If set, this environment variable will be checked to determine whether to disable ANSI color codes.
     * The logic is the same as `looseBooleanParser` so if set it will be interpreted as `true` unless it explicitly has a falsey value.
     *
     * Stricli will always read the `STRICLI_NO_COLOR` environment variable to determine whether to disable color output,
     * but this option allows you to specify an additional variable name to disable color for the help text if desired.
     */
    readonly disableColorVariableName?: string;
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
            global: true,
            aliases: alias === false ? [] : [alias],
            async run(this, app, { text, ansiColorByStream, result, additionalFlags }) {
                let ansiColor = ansiColorByStream.stdout;
                if (ansiColor && config.disableColorVariableName) {
                    ansiColor = !checkEnvironmentVariable(this.process, config.disableColorVariableName);
                }
                this.process.stdout.write(
                    result.target.formatHelp({
                        prefix: result.prefix,
                        additionalFlags,
                        includeArgumentEscapeSequenceFlag: app.config.scanner.allowArgumentEscapeSequence,
                        includeHidden,
                        config: formatting,
                        aliases: result.aliases[formatting.caseStyle],
                        text,
                        ansiColor,
                    }),
                );
            },
        },
    };
}
