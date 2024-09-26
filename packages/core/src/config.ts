// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { type ApplicationText, defaultTextLoader } from "./text";
import type { ApplicationContext } from "./context";
import { InternalError } from "./util/error";
import type { DamerauLevenshteinOptions } from "./util/distance";
import { convertCamelCaseToKebabCase } from "./util/case-style";

/**
 * Methods to determine application version information for `--version` flag or latest version check.
 */
export type VersionInfo = (
    | {
          /**
           * Statically known current version.
           */
          readonly currentVersion: string;
      }
    | {
          /**
           * Asynchonously determine the current version of this application.
           */
          readonly getCurrentVersion: (this: ApplicationContext) => Promise<string>;
      }
) & {
    /**
     * Asynchonously determine the latest version of this application.
     * If value is retrieved from cache, a change to the current version should invalidate that cache.
     */
    readonly getLatestVersion?: (this: ApplicationContext, currentVersion: string) => Promise<string | undefined>;
    /**
     * Command to display to the end user that will upgrade this application.
     * Passed to {@link ApplicationText.currentVersionIsNotLatest} to format/localize.
     */
    readonly upgradeCommand?: string;
};

/**
 * Case style configuration for parsing route and flag names from the command line.
 * Each value has the following behavior:
 * * `original` - Only accepts exact matches.
 * * `allow-kebab-for-camel` - In addition to exact matches, allows kebab-case input for camelCase.
 */
export type ScannerCaseStyle = "original" | "allow-kebab-for-camel";

/**
 * Configuration for controlling the behavior of the command and argument scanners.
 */
export interface ScannerConfiguration {
    /**
     * Case style configuration for scanning route and flag names.
     *
     * Default value is `original`
     */
    readonly caseStyle: ScannerCaseStyle;
    /**
     * If true, when scanning inputs for a command will treat `--` as an escape sequence.
     * This will force the scanner to treat all remaining inputs as arguments.
     *
     * Example for `false`
     * ```shell
     * $ cli --foo -- --bar
     * # { foo: true, bar: true }, ["--"]
     * ```
     *
     * Example for `true`
     * ```shell
     * $ cli --foo -- --bar
     * # { foo: true }, ["--bar"]
     * ```
     *
     * Default value is `false`
     */
    readonly allowArgumentEscapeSequence: boolean;
    /**
     * Options used when calculating distance for alternative inputs ("did you mean?").
     *
     * Default value is equivalent to the empirically determined values used by git:
     * ```json
     * {
     *   "threshold": 7,
     *   "weights": {
     *     "insertion": 1,
     *     "deletion": 3,
     *     "substitution": 2,
     *     "transposition": 0
     *   }
     * }
     * ```
     */
    readonly distanceOptions: DamerauLevenshteinOptions;
}

/**
 * Case style configuration for displaying route and flag names in documentation text.
 * Each value has the following behavior:
 * * `original` - Displays the original names unchanged.
 * * `convert-camel-to-kebab` - Converts all camelCase names to kebab-case in output. Only allowed if `scannerCaseStyle` is set to `allow-kebab-for-camel`.
 */
export type DisplayCaseStyle = "original" | "convert-camel-to-kebab";

export function formatForDisplay(flagName: string, displayCaseStyle: DisplayCaseStyle): string {
    if (displayCaseStyle === "convert-camel-to-kebab") {
        return convertCamelCaseToKebabCase(flagName);
    }
    return flagName;
}

export function formatAsNegated(flagName: string, displayCaseStyle: DisplayCaseStyle): string {
    if (displayCaseStyle === "convert-camel-to-kebab") {
        return `no-${convertCamelCaseToKebabCase(flagName)}`;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return `no${flagName[0]!.toUpperCase()}${flagName.slice(1)}`;
}

/**
 * Configuration for controlling the content of the printed documentation.
 */
export interface DocumentationConfiguration {
    /**
     * In addition to the `--help` flag, there is a `--helpAll`/`--help-all` flag that shows all documentation
     * including entries for hidden commands/arguments.
     * The `--helpAll` flag cannot be functionally disabled, but it is hidden when listing the built-in flags by default.
     * Setting this option to `true` forces the output to always include this flag in the list of built-in flags.
     *
     * Defaults to `false`.
     */
    readonly alwaysShowHelpAllFlag: boolean;
    /**
     * Controls whether or not to include alias of flags in the usage line.
     * Only replaces name with alias when a single alias exists.
     *
     * Defaults to `false`.
     */
    readonly useAliasInUsageLine: boolean;
    /**
     * Controls whether or not to include optional flags and positional parameters in the usage line.
     * If enabled, all parameters that are optional at runtime (including parameters with defaults) will be hidden.
     *
     * Defaults to `false`.
     */
    readonly onlyRequiredInUsageLine: boolean;
    /**
     * Case style configuration for displaying route and flag names.
     * Cannot be `convert-camel-to-kebab` if {@link ScannerConfiguration.caseStyle} is `original`.
     *
     * Default value is derived from value for {@link ScannerConfiguration.caseStyle}:
     * * Defaults to `original` for `original`.
     * * Defaults to `convert-camel-to-kebab` for `allow-kebab-for-camel`.
     */
    readonly caseStyle: DisplayCaseStyle;
    /**
     * By default, if the color depth of the stdout stream is greater than 4, ANSI terminal colors will be used.
     * If this value is `true`, disables all ANSI terminal color output.
     *
     * Defaults to `false`.
     */
    readonly disableAnsiColor: boolean;
}

/**
 * Configuration for controlling the behavior of completion proposals.
 */
export interface CompletionConfiguration {
    /**
     * This flag controls whether or not to include aliases of routes and flags.
     *
     * Defaults to match value of {@link DocumentationConfiguration.useAliasInUsageLine}.
     */
    readonly includeAliases: boolean;
    /**
     * This flag controls whether or not to include hidden routes.
     *
     * Defaults to `false`.
     */
    readonly includeHiddenRoutes: boolean;
}

/**
 * Configuration for controlling the localization behavior.
 */
export interface LocalizationConfiguration {
    /**
     * The default locale that should be used if the context does not have a locale.
     *
     * If unspecified, will default to `en`.
     */
    readonly defaultLocale: string;
    /**
     * Mapping of locale to application text.
     * Locale is optionally provided at runtime by the context.
     *
     * If unspecified, will return the default English implementation {@link text_en} for all "en" locales.
     */
    readonly loadText: (locale: string) => ApplicationText | undefined;
}

/**
 * Configuration for controlling the runtime behavior of the application.
 */
export interface ApplicationConfiguration {
    /**
     * Unique name for this application.
     * It should match the command that is used to run the application.
     */
    readonly name: string;
    /**
     * If supplied, application will be aware of version info at runtime.
     *
     * Before every run, the application will fetch the latest version and warn if it differs from the current version.
     * As well, a new flag `--version` (with alias `-v`) will be available on the base route, which will print the current
     * version to stdout.
     */
    readonly versionInfo?: VersionInfo;
    /**
     * If supplied, customizes the command/argument scanning behavior of the application.
     *
     * See documentation of inner types for default values.
     */
    readonly scanner: ScannerConfiguration;
    /**
     * If supplied, customizes the formatting of documentation lines in help text.
     *
     * See documentation of inner types for default values.
     */
    readonly documentation: DocumentationConfiguration;
    /**
     * If supplied, customizes command completion proposal behavior.
     *
     * See documentation of inner types for default values.
     */
    readonly completion: CompletionConfiguration;
    /**
     * If supplied, customizes text localization.
     *
     * See documentation of inner types for default values.
     */
    readonly localization: LocalizationConfiguration;
    /**
     * In the case where a command function throws some value unexpectedly or safely returns an Error,
     * this function will translate that into an exit code.
     *
     * If unspecified, the exit code will default to 1 when a command function throws some value.
     */
    readonly determineExitCode?: (exc: unknown) => number;
}

/**
 * Partial configuration for application, see individual description for behavior when each value is unspecified.
 */
export type PartialApplicationConfiguration = Pick<
    ApplicationConfiguration,
    "name" | "versionInfo" | "determineExitCode"
> & {
    [K in "scanner" | "documentation" | "completion" | "localization"]?: Partial<ApplicationConfiguration[K]>;
};

/**
 * @internal
 */
export function withDefaults(config: PartialApplicationConfiguration): ApplicationConfiguration {
    const scannerCaseStyle = config.scanner?.caseStyle ?? "original";
    let displayCaseStyle: DisplayCaseStyle;
    if (config.documentation?.caseStyle) {
        if (scannerCaseStyle === "original" && config.documentation.caseStyle === "convert-camel-to-kebab") {
            throw new InternalError("Cannot convert route and flag names on display but scan as original");
        }
        displayCaseStyle = config.documentation.caseStyle;
    } else if (scannerCaseStyle === "allow-kebab-for-camel") {
        displayCaseStyle = "convert-camel-to-kebab";
    } else {
        displayCaseStyle = scannerCaseStyle;
    }
    const scannerConfig: ScannerConfiguration = {
        caseStyle: scannerCaseStyle,
        allowArgumentEscapeSequence: config.scanner?.allowArgumentEscapeSequence ?? false,
        distanceOptions: config.scanner?.distanceOptions ?? {
            threshold: 7,
            weights: {
                insertion: 1,
                deletion: 3,
                substitution: 2,
                transposition: 0,
            },
        },
    };
    const documentationConfig: DocumentationConfiguration = {
        alwaysShowHelpAllFlag: config.documentation?.alwaysShowHelpAllFlag ?? false,
        useAliasInUsageLine: config.documentation?.useAliasInUsageLine ?? false,
        onlyRequiredInUsageLine: config.documentation?.onlyRequiredInUsageLine ?? false,
        caseStyle: displayCaseStyle,
        disableAnsiColor: config.documentation?.disableAnsiColor ?? false,
    };
    const completionConfig: CompletionConfiguration = {
        includeAliases: config.completion?.includeAliases ?? documentationConfig.useAliasInUsageLine,
        includeHiddenRoutes: config.completion?.includeHiddenRoutes ?? false,
        ...config.completion,
    };
    return {
        ...config,
        scanner: scannerConfig,
        completion: completionConfig,
        documentation: documentationConfig,
        localization: {
            defaultLocale: "en",
            loadText: defaultTextLoader,
            ...config.localization,
        },
    };
}
