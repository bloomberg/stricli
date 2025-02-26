// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
import { handleCompletionsForShell } from "../src";
// eslint-disable-next-line no-restricted-imports
import { buildApplication, buildCommand, buildRouteMap } from "@stricli/core";
import { buildFakeContext } from "./fakes/context";

function buildBasicCommand() {
    return buildCommand({
        func: async () => {},
        parameters: {},
        docs: {
            brief: "basic command",
        },
    });
}

function buildBasicRouteMap(commands: string[]) {
    return buildRouteMap({
        routes: Object.fromEntries(commands.map((command) => [command, buildBasicCommand()])),
        docs: {
            brief: "basic route map",
        },
    });
}

describe("bash", () => {
    describe("handleCompletions", () => {
        it("prints flag suggestions for multi-command app", async () => {
            // GIVEN
            const root = buildCommand({
                func: async (flags: { foo: boolean; bar: boolean; baz: boolean }) => {},
                parameters: {
                    flags: {
                        foo: {
                            kind: "boolean",
                            brief: "foo flag",
                        },
                        bar: {
                            kind: "boolean",
                            brief: "bar flag",
                        },
                        baz: {
                            kind: "boolean",
                            brief: "baz flag",
                        },
                    },
                },
                docs: {
                    brief: "basic command",
                },
            });
            const app = buildApplication(root, {
                name: "run",
            });

            // WHEN
            const context = buildFakeContext({
                env: {
                    COMP_LINE: `${app.config.name} `,
                },
            });
            await handleCompletionsForShell("bash", app, [], context);

            // THEN
            expect(context.process.stdout.write.args.flat()).to.deep.equal(["--foo\n", "--bar\n", "--baz\n"]);
        });

        it("prints command suggestions for multi-command app", async () => {
            // GIVEN
            const root = buildBasicRouteMap(["foo", "bar", "baz"]);
            const app = buildApplication(root, {
                name: "run",
            });

            // WHEN
            const context = buildFakeContext({
                env: {
                    COMP_LINE: `${app.config.name} `,
                },
            });
            await handleCompletionsForShell("bash", app, [], context);

            // THEN
            expect(context.process.stdout.write.args.flat()).to.deep.equal(["foo\n", "bar\n", "baz\n"]);
        });
    });
});
