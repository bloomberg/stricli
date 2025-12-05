// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import { type SinonStubbedInstance, stub } from "sinon";
import { type ApplicationText, text_en } from "../../src";

export function buildFakeApplicationText(): SinonStubbedInstance<ApplicationText> {
    return {
        ...text_en,
        noCommandRegisteredForInput:
            stub<[{ input: string; corrections: readonly string[]; ansiColor: boolean }]>().returns(
                "noCommandRegisteredForInput",
            ),
        noTextAvailableForLocale:
            stub<[{ requestedLocale: string; defaultLocale: string; ansiColor: boolean }]>().returns(
                "noTextAvailableForLocale",
            ),
        currentVersionIsNotLatest:
            stub<[{ currentVersion: string; latestVersion: string; ansiColor: boolean }]>().returns(
                "currentVersionIsNotLatest",
            ),
        exceptionWhileParsingArguments: stub<[unknown, boolean]>().returns("exceptionWhileParsingArguments"),
        exceptionWhileLoadingCommandFunction: stub<[unknown, boolean]>().returns(
            "exceptionWhileLoadingCommandFunction",
        ),
        exceptionWhileLoadingCommandContext: stub<[unknown, boolean]>().returns("exceptionWhileLoadingCommandContext"),
        exceptionWhileRunningCommand: stub<[unknown, boolean]>().returns("exceptionWhileRunningCommand"),
        commandErrorResult: stub<[Error, boolean]>().returns("commandErrorResult"),
    };
}
