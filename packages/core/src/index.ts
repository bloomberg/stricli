// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { runApplication } from "./application/run";
import type { Application } from "./application/types";
import type { CommandContext, StricliDynamicCommandContext } from "./context";

export { buildApplication } from "./application/builder";
export { generateHelpTextForAllCommands } from "./application/documentation";
export type { DocumentedCommand } from "./application/documentation";
export { proposeCompletionsForApplication as proposeCompletions } from "./application/propose-completions";
export type { InputCompletion } from "./application/propose-completions";
export type { Application } from "./application/types";
export type {
    ApplicationConfiguration,
    CompletionConfiguration,
    DisplayCaseStyle,
    DocumentationConfiguration,
    PartialApplicationConfiguration,
    ScannerCaseStyle,
    ScannerConfiguration,
    VersionInfo,
} from "./config";
export type {
    ApplicationContext,
    CommandContext,
    CommandInfo,
    EnvironmentVariableName,
    StricliCommandContextBuilder,
    StricliDynamicCommandContext,
    StricliProcess,
} from "./context";
export { ExitCode } from "./exit-code";
export type { FlagParametersForType, TypedFlagParameter } from "./parameter/flag/types";
export { booleanParser, looseBooleanParser } from "./parameter/parser/boolean";
export { buildChoiceParser } from "./parameter/parser/choice";
export { numberParser } from "./parameter/parser/number";
export type { TypedPositionalParameter, TypedPositionalParameters } from "./parameter/positional/types";
export {
    AliasNotFoundError,
    ArgumentParseError,
    ArgumentScannerError,
    EnumValidationError,
    FlagNotFoundError,
    InvalidNegatedFlagSyntaxError,
    UnexpectedFlagError,
    UnexpectedPositionalError,
    UnsatisfiedFlagError,
    UnsatisfiedPositionalError,
    formatMessageForArgumentScannerError,
} from "./parameter/scanner";
export type {
    Aliases,
    InputParser,
    TypedCommandFlagParameters,
    TypedCommandParameters,
    TypedCommandPositionalParameters,
} from "./parameter/types";
export { buildCommand } from "./routing/command/builder";
export type { CommandBuilderArguments } from "./routing/command/builder";
export type { Command } from "./routing/command/types";
export { buildRouteMap } from "./routing/route-map/builder";
export type { RouteMapBuilderArguments } from "./routing/route-map/builder";
export type { RouteMap } from "./routing/route-map/types";
export { text_en } from "./text";
export type {
    ApplicationErrorFormatting,
    ApplicationText,
    DocumentationBriefs,
    DocumentationHeaders,
    DocumentationKeywords,
} from "./text";

export async function run<CONTEXT extends CommandContext>(
    app: Application<CONTEXT>,
    inputs: readonly string[],
    context: StricliDynamicCommandContext<CONTEXT>,
): Promise<void> {
    const exitCode = await runApplication(app, inputs, context);

    // We set the exit code instead of calling exit() so as not
    // to cancel any pending tasks (e.g. stdout writes)
    context.process.exitCode = exitCode;
}
