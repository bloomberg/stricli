// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import { vi, type MockedObject } from "vitest";
import { text_en, type ApplicationText } from "../../src";

export function buildFakeApplicationText(): MockedObject<ApplicationText> {
    return {
        ...text_en,
        noCommandRegisteredForInput: vi
            .fn<(args: { input: string; corrections: readonly string[]; ansiColor: boolean }) => string>()
            .mockReturnValue("noCommandRegisteredForInput"),
        noTextAvailableForLocale: vi
            .fn<(args: { requestedLocale: string; defaultLocale: string; ansiColor: boolean }) => string>()
            .mockReturnValue("noTextAvailableForLocale"),
        currentVersionIsNotLatest: vi
            .fn<(args: { currentVersion: string; latestVersion: string; ansiColor: boolean }) => string>()
            .mockReturnValue("currentVersionIsNotLatest"),
        formatException: vi.fn<(exc: unknown) => string>().mockReturnValue("formatException"),
        exceptionWhileParsingArguments: vi
            .fn<(exc: unknown, ansiColor: boolean) => string>()
            .mockReturnValue("exceptionWhileParsingArguments"),
        exceptionWhileLoadingCommandFunction: vi
            .fn<(exc: unknown, ansiColor: boolean) => string>()
            .mockReturnValue("exceptionWhileLoadingCommandFunction"),
        exceptionWhileLoadingCommandContext: vi
            .fn<(exc: unknown, ansiColor: boolean) => string>()
            .mockReturnValue("exceptionWhileLoadingCommandContext"),
        exceptionWhileRunningCommand: vi
            .fn<(exc: unknown, ansiColor: boolean) => string>()
            .mockReturnValue("exceptionWhileRunningCommand"),
        commandErrorResult: vi.fn<(error: Error, ansiColor: boolean) => string>().mockReturnValue("commandErrorResult"),
        exceptionWhileRunningIntegrationHook: vi
            .fn<(args: { exception: unknown; hook: string; integration: string; ansiColor: boolean }) => string>()
            .mockReturnValue("exceptionWhileRunningIntegrationHook"),
        exceptionWhileRunningIntegrationFlag: vi
            .fn<(args: { exception: unknown; integration: string; ansiColor: boolean }) => string>()
            .mockReturnValue("exceptionWhileRunningIntegrationFlag"),
    };
}
