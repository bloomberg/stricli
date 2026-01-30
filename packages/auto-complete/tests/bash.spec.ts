// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildCommand, buildRouteMap, run, type Application } from "@stricli/core";
import sinon from "sinon";
import { describe, it, expect } from "vitest";
import {
    buildUnifiedInstallCommand,
    buildInstallCommand,
    buildUnifiedUninstallCommand,
    buildUninstallCommand,
    handleCompletionsForShell,
    type StricliAutoCompleteContext,
    buildAutocompleteRouteMap,
    buildUnifiedAutocompleteRouteMap,
} from "../src";
// eslint-disable-next-line no-restricted-imports
import { app } from "../src/cli/app";
// eslint-disable-next-line no-restricted-imports
import bash from "../src/shells/bash";
import { fakeContextSerializer } from "./snapshot-serializers";
import { FakeContext } from "./fakes/context";

// Register custom snapshot serializer for FakeContext
expect.addSnapshotSerializer(fakeContextSerializer);

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
    describe("[internal]", () => {
        describe("isShellActive", () => {
            it("no env vars", async () => {
                // WHEN
                const context = new FakeContext();
                const active = await bash.isShellActive(context);

                // THEN
                expect(active).to.equal(false);
            });

            it("SHELL env var empty", async () => {
                // WHEN
                const context = new FakeContext([], {
                    SHELL: "",
                });
                const active = await bash.isShellActive(context);

                // THEN
                expect(active).to.equal(false);
            });

            it("SHELL env var contains bash", async () => {
                // WHEN
                const context = new FakeContext([], {
                    SHELL: "bash",
                });
                const active = await bash.isShellActive(context);

                // THEN
                expect(active).to.equal(true);
            });

            it("SHELL env var contains sh", async () => {
                // WHEN
                const context = new FakeContext([], {
                    SHELL: "sh",
                });
                const active = await bash.isShellActive(context);

                // THEN
                expect(active).to.equal(false);
            });
        });

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
                const context = new FakeContext([], {
                    COMP_LINE: `${app.config.name} `,
                });
                await handleCompletionsForShell("bash", app, [], context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("prints command suggestions for multi-command app", async () => {
                // GIVEN
                const root = buildBasicRouteMap(["foo", "bar", "baz"]);
                const app = buildApplication(root, {
                    name: "run",
                });

                // WHEN
                const context = new FakeContext([], {
                    COMP_LINE: `${app.config.name} `,
                });
                await handleCompletionsForShell("bash", app, [], context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("ignores errors", async () => {
                // GIVEN
                const app = {} as Application<StricliAutoCompleteContext>;

                // WHEN
                const context = new FakeContext([], {
                    COMP_LINE: `run `,
                });
                await handleCompletionsForShell("bash", app, [], context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("ignores errors", async () => {
                // GIVEN
                const app = {} as Application<StricliAutoCompleteContext>;

                // WHEN
                const context = new FakeContext();
                await handleCompletionsForShell("bash", app, [], context);

                // THEN
                expect(context).toMatchSnapshot();
            });
        });
    });

    describe("[standalone]", () => {
        describe("install", () => {
            it("adds section to .bashrc", async () => {
                // GIVEN
                const inputs = ["install", "TARGET_CMD", "--bash", "BASH_CMD"];

                // WHEN
                const bashrc = ["# .bashrc"].join("\n");
                const context = new FakeContext([["~/.bashrc", bashrc]]);
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("updates section in .bashrc", async () => {
                // GIVEN
                const inputs = ["install", "TARGET_CMD", "--bash", "BASH_CMD"];

                // WHEN
                const bashrc = [
                    "# .bashrc",
                    "# @stricli/auto-complete START [TARGET_CMD]",
                    "CORRUPTED OR OUTDATED CONTENTS",
                    "# @stricli/auto-complete END",
                    "",
                    "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                    "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                    "# @stricli/auto-complete END",
                ].join("\n");
                const context = new FakeContext([["~/.bashrc", bashrc]]);
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("fails if .bashrc not found", async () => {
                // GIVEN
                const inputs = ["install", "TARGET_CMD", "--bash", "BASH_CMD"];

                // WHEN
                const context = new FakeContext();
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });
        });

        describe("uninstall", () => {
            it("removes section in .bashrc", async () => {
                // GIVEN
                const inputs = ["uninstall", "TARGET_CMD", "--bash"];

                // WHEN
                const bashrc = [
                    "# .bashrc",
                    "# @stricli/auto-complete START [TARGET_CMD]",
                    "CORRUPTED OR OUTDATED CONTENTS",
                    "# @stricli/auto-complete END",
                    "",
                    "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                    "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                    "# @stricli/auto-complete END",
                ].join("\n");
                const context = new FakeContext([["~/.bashrc", bashrc]]);
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("ignores empty .bashrc", async () => {
                // GIVEN
                const inputs = ["uninstall", "TARGET_CMD", "--bash"];

                // WHEN
                const bashrc = ["# .bashrc"].join("\n");
                const context = new FakeContext([["~/.bashrc", bashrc]]);
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });

            it("fails if .bashrc not found", async () => {
                // GIVEN
                const inputs = ["uninstall", "TARGET_CMD", "--bash"];

                // WHEN
                const context = new FakeContext();
                await run(app, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });
        });

        describe("unified", () => {
            describe("install", () => {
                it("adds section to .bashrc", async () => {
                    // GIVEN
                    const inputs = ["unified", "install", "TARGET_CMD", "--autocomplete-command", "AUTC_CMD"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("updates section in .bashrc", async () => {
                    // GIVEN
                    const inputs = ["unified", "install", "TARGET_CMD", "--autocomplete-command", "AUTC_CMD"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("does nothing if bash not active", async () => {
                    // GIVEN
                    const inputs = ["unified", "install", "TARGET_CMD", "--autocomplete-command", "AUTC_CMD"];

                    // WHEN
                    const context = new FakeContext();
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });

            describe("uninstall", () => {
                it("removes section in .bashrc", async () => {
                    // GIVEN
                    const inputs = ["unified", "uninstall", "TARGET_CMD"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("ignores empty .bashrc", async () => {
                    // GIVEN
                    const inputs = ["unified", "uninstall", "TARGET_CMD"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("does nothing if bash not active", async () => {
                    // GIVEN
                    const inputs = ["unified", "uninstall", "TARGET_CMD"];

                    // WHEN
                    const context = new FakeContext();
                    await run(app, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });
        });
    });

    describe("[embedded]", () => {
        describe("buildAutocompleteRouteMap", () => {
            describe("install", () => {
                it("adds section to .bashrc", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]]);
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("updates section in .bashrc", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]]);
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("fails if .bashrc not found", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("(help text)", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs = ["install", "--help"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });

            describe("uninstall", () => {
                it("removes section in .bashrc", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]]);
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("ignores empty .bashrc", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]]);
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("fails if .bashrc not found", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("(help text)", async () => {
                    // GIVEN
                    const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs = ["uninstall", "--help"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });

            it("(help text)", async () => {
                // GIVEN
                const root = buildAutocompleteRouteMap("TARGET_CMD", { bash: "BASH_CMD" });
                const customApp = buildApplication(root, {
                    name: "APP_NAME",
                });
                const inputs = ["--help"];

                // WHEN
                const context = new FakeContext();
                await run(customApp, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });
        });

        describe("buildUnifiedAutocompleteRouteMap", () => {
            describe("install", () => {
                it("adds section to .bashrc", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("updates section in .bashrc", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("does nothing if bash not active", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["install"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("(help text)", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs = ["install", "--help"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });

            describe("uninstall", () => {
                it("removes section in .bashrc", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const bashrc = [
                        "# .bashrc",
                        "# @stricli/auto-complete START [TARGET_CMD]",
                        "CORRUPTED OR OUTDATED CONTENTS",
                        "# @stricli/auto-complete END",
                        "",
                        "# @stricli/auto-complete START [OTHER_TARGET_CMD]",
                        "UNRELATED SECTION FOR A DIFFERENT TARGET COMMAND",
                        "# @stricli/auto-complete END",
                    ].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("ignores empty .bashrc", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const bashrc = ["# .bashrc"].join("\n");
                    const context = new FakeContext([["~/.bashrc", bashrc]], { SHELL: "bash" });
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("does nothing if bash not active", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs: string[] = ["uninstall"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });

                it("(help text)", async () => {
                    // GIVEN
                    const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                        autocompleteCommand: "AUTC_CMD",
                        onlyActiveShells: true,
                    });
                    const customApp = buildApplication(root, {
                        name: "APP_NAME",
                    });
                    const inputs = ["uninstall", "--help"];

                    // WHEN
                    const context = new FakeContext();
                    await run(customApp, inputs, context);

                    // THEN
                    expect(context).toMatchSnapshot();
                });
            });

            it("(help text)", async () => {
                // GIVEN
                const root = buildUnifiedAutocompleteRouteMap("TARGET_CMD", {
                    autocompleteCommand: "AUTC_CMD",
                    onlyActiveShells: true,
                });
                const customApp = buildApplication(root, {
                    name: "APP_NAME",
                });
                const inputs = ["--help"];

                // WHEN
                const context = new FakeContext();
                await run(customApp, inputs, context);

                // THEN
                expect(context).toMatchSnapshot();
            });
        });
    });
});
