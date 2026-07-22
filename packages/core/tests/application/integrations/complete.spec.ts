// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it, vi } from "vitest";
import {
    buildApplication,
    buildCommand,
    buildRouteMap,
    complete,
    run,
    type CompleteIntegrationConfiguration,
    type InputCompletion,
} from "../../../src";
import { buildFakeContext } from "../../fakes/context";

function buildRouteMapForCompleteTests() {
    const command = buildCommand({
        func: async (flags: { alpha: boolean; bravo: boolean; bar: boolean }) => {},
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [],
            },
            flags: {
                alpha: {
                    brief: "camelCase",
                    kind: "boolean",
                },
                bravo: {
                    brief: "camelCase",
                    kind: "boolean",
                },
                bar: {
                    brief: "camelCase",
                    kind: "boolean",
                },
            },
            aliases: {
                b: "bar",
            },
        },
        docs: {
            brief: "basic command",
        },
    });
    return buildRouteMap({
        routes: {
            commandOne: command,
            commandTwo: command,
            commandHidden: command,
        },
        docs: {
            brief: "root route",
            hideRoute: {
                commandHidden: true,
            },
        },
    });
}

async function completeWithInputs(
    config: Omit<CompleteIntegrationConfiguration, "handleCompletions">,
    inputs: readonly string[],
    ...args: Parameters<typeof buildFakeContext>
): Promise<readonly InputCompletion[]> {
    const root = buildRouteMapForCompleteTests();
    const handleCompletions = vi.fn<(completions: readonly InputCompletion[]) => void>();
    const app = buildApplication(
        root,
        {
            name: "test",
        },
        {
            complete: complete({
                handleCompletions,
                ...config,
            }),
        },
    );
    const context = buildFakeContext(...args);
    await run(app, ["--complete", app.config.name, ...inputs], context);
    expect(handleCompletions).toHaveBeenCalledOnce();
    expect(context.process.exitCode).to.equal(0);
    expect(context.process.stdout.write.args.map(([text]) => text).join("")).to.equal("");
    expect(context.process.stderr.write.args.map(([text]) => text).join("")).to.equal("");
    return handleCompletions.mock.calls[0]?.[0] ?? [];
}

describe("complete integration", () => {
    it("no completions for no inputs", async () => {
        // GIVEN
        const config: Omit<CompleteIntegrationConfiguration, "handleCompletions"> = {
            brief: "complete integration",
            includeAliases: true,
            includeHiddenRoutes: true,
        };

        // WHEN
        const completions = await completeWithInputs(config, []);

        // THEN
        expect(completions).to.have.deep.members([]);
    });

    it("has completions for empty partial", async () => {
        // GIVEN
        const config: Omit<CompleteIntegrationConfiguration, "handleCompletions"> = {
            brief: "complete integration",
            includeAliases: true,
            includeHiddenRoutes: true,
        };

        // WHEN
        const completions = await completeWithInputs(config, [""]);

        // THEN
        expect(completions).to.have.deep.members([
            {
                kind: "routing-target:command",
                completion: "commandOne",
                brief: "basic command",
            },
            {
                kind: "routing-target:command",
                completion: "commandTwo",
                brief: "basic command",
            },
            {
                kind: "routing-target:command",
                completion: "commandHidden",
                brief: "basic command",
            },
        ]);
    });

    it("no completions for no inputs, completeNextInput returns false", async () => {
        // GIVEN
        const config: Omit<CompleteIntegrationConfiguration, "handleCompletions"> = {
            brief: "complete integration",
            includeAliases: true,
            includeHiddenRoutes: true,
            completeNextInput: () => false,
        };

        // WHEN
        const completions = await completeWithInputs(config, []);

        // THEN
        expect(completions).to.have.deep.members([]);
    });

    it("has completions for no inputs, completeNextInput returns true", async () => {
        // GIVEN
        const config: Omit<CompleteIntegrationConfiguration, "handleCompletions"> = {
            brief: "complete integration",
            includeAliases: true,
            includeHiddenRoutes: true,
            completeNextInput: () => true,
        };

        // WHEN
        const completions = await completeWithInputs(config, []);

        // THEN
        expect(completions).to.have.deep.members([
            {
                kind: "routing-target:command",
                completion: "commandOne",
                brief: "basic command",
            },
            {
                kind: "routing-target:command",
                completion: "commandTwo",
                brief: "basic command",
            },
            {
                kind: "routing-target:command",
                completion: "commandHidden",
                brief: "basic command",
            },
        ]);
    });
});
