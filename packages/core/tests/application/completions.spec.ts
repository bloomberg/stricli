// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    buildApplication,
    buildCommand,
    numberParser,
    proposeCompletions,
    type Application,
    type CommandContext,
    type InputCompletion,
    type VersionInfo,
} from "../../src";
import { buildBasicRouteMap, buildRouteMapForFakeContext } from "../application";
import { buildFakeContext } from "../fakes/context";

function testCompletions(app: Application<CommandContext>, inputs: string[], expected: readonly InputCompletion[]) {
    const line = inputs.join(" ");
    describe(`proposes [${expected.map(({ completion }) => completion).join()}] for "${line}"`, () => {
        it("static context", async () => {
            const context = buildFakeContext({ forCommand: false, colorDepth: 2 });
            const completions = await proposeCompletions(app, inputs, context);
            expect(completions).to.have.deep.members(expected);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });

        it("dynamic context", async () => {
            const context = buildFakeContext({ forCommand: true, colorDepth: 2 });
            const completions = await proposeCompletions(app, inputs, context);
            expect(completions).to.have.deep.members(expected);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });

        it("error loading context", async () => {
            const context = buildFakeContext({
                forCommand: () => {
                    throw new Error("This function purposefully throws an error");
                },
                colorDepth: void 0,
            });
            await proposeCompletions(app, inputs, context);
            const completions = context.process.stdout.write.args.flat(2)[0]?.split("\n") ?? [];
            expect(completions).to.have.deep.members([]);
            expect(context.process.stderr.write.callCount).to.equal(0);
        });
    });
}

describe("proposeCompletions", () => {
    describe("for route map at root", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        testCompletions(
            app,
            ["baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["--help", ""], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["--version", ""], []);
        testCompletions(app, ["foo", "--help"], []);
        testCompletions(app, ["foo", "--help", ""], []);
    });

    describe("for route map at root including aliases", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: { brief: "root route map" },
            aliases: {
                doFoo: "foo",
                b: "bar",
                bz: "baz",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            completion: {
                includeAliases: true,
            },
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );
        testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        testCompletions(
            app,
            ["baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);
        testCompletions(app, ["fake", "b"], []);
        testCompletions(app, ["fake", "fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo", "--help"], []);
    });

    describe("for route map at root exclude aliases", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: { brief: "root route map" },
            aliases: {
                doFoo: "foo",
                b: "bar",
                bz: "baz",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            completion: {
                includeAliases: false,
            },
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );
        testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        testCompletions(
            app,
            ["baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);
        testCompletions(app, ["fake", "b"], []);
        testCompletions(app, ["fake", "fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo", "--help"], []);
    });

    describe("for route map at root including hidden routes", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: {
                brief: "root route map",
                hideRoute: {
                    baz: true,
                },
            },
            aliases: {
                doFoo: "foo",
                b: "bar",
                bz: "baz",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            completion: {
                includeAliases: true,
                includeHiddenRoutes: true,
            },
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["b", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );
        testCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        testCompletions(
            app,
            ["baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);
        testCompletions(app, ["fake", "b"], []);
        testCompletions(app, ["fake", "fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo", "--help"], []);
    });

    describe("for route map at root excluding hidden routes", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: {
                brief: "root route map",
                hideRoute: {
                    baz: true,
                },
            },
            aliases: {
                doFoo: "foo",
                b: "bar",
                bz: "baz",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            completion: {
                includeAliases: true,
                includeHiddenRoutes: false,
            },
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["b", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );
        testCompletions(app, ["baz"], []);
        testCompletions(
            app,
            ["baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);
        testCompletions(app, ["fake", "b"], []);
        testCompletions(app, ["fake", "fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo", "--help"], []);
    });

    describe("for route map at root with camelCase route names", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                fooFlag: buildBasicRouteMap("fooFlag"),
                barFlag: buildBasicRouteMap("barFlag"),
                bazFlag: buildBasicRouteMap("bazFlag"),
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "fooFlag", brief: "fooFlag" },
                { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
            ],
        );
        testCompletions(
            app,
            ["bazFlag"],
            [{ kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" }],
        );
        testCompletions(
            app,
            ["bazFlag", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["fooFlag", "--help"], []);
    });

    describe("for route map at root with camelCase route names, `allow-kebab-for-camel` parse case style", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                fooFlag: buildBasicRouteMap("fooFlag"),
                barFlag: buildBasicRouteMap("barFlag"),
                bazFlag: buildBasicRouteMap("bazFlag"),
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            scanner: { caseStyle: "allow-kebab-for-camel" },
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo-flag", brief: "fooFlag" },
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
            ],
        );
        testCompletions(
            app,
            ["baz-flag"],
            [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" }],
        );
        testCompletions(
            app,
            ["baz-flag", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo-flag", "--help"], []);
    });

    describe("for route map at root with kebab-case route names, `original` parse case style", () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                "foo-flag": buildBasicRouteMap("foo-flag"),
                "bar-flag": buildBasicRouteMap("bar-flag"),
                "baz-flag": buildBasicRouteMap("baz-flag"),
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // THEN
        testCompletions(app, [], []);

        testCompletions(
            app,
            [""],
            [
                { kind: "routing-target:route-map", completion: "foo-flag", brief: "foo-flag" },
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
            ],
        );
        testCompletions(
            app,
            ["b"],
            [
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
            ],
        );
        testCompletions(
            app,
            ["baz-flag"],
            [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" }],
        );
        testCompletions(
            app,
            ["baz-flag", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["g"], []);
        testCompletions(app, ["fake"], []);
        testCompletions(app, ["fake", ""], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["foo-flag", "--help"], []);
    });

    describe("nested route map", () => {
        // GIVEN
        const nestedRouteMap = buildRouteMapForFakeContext({
            routes: {
                foo: buildBasicRouteMap("foo"),
                bar: buildBasicRouteMap("bar"),
                baz: buildBasicRouteMap("baz"),
            },
            docs: { brief: "nested route map" },
        });
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                nested: nestedRouteMap,
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // THEN
        testCompletions(
            app,
            [""],
            [{ kind: "routing-target:route-map", completion: "nested", brief: "nested route map" }],
        );
        testCompletions(
            app,
            ["nested", ""],
            [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["nested", "b"],
            [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ],
        );
        testCompletions(
            app,
            ["nested", "baz", ""],
            [{ kind: "routing-target:command", completion: "command", brief: "basic command" }],
        );

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["nested", "--help"], []);
        testCompletions(app, ["nested", "foo", "--help"], []);
    });

    describe("command at root without aliases", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            parse: numberParser,
                            brief: "number",
                            proposeCompletions: () => ["100", "150", "200"],
                        },
                    ],
                },
                flags: {
                    foo: {
                        kind: "boolean",
                        brief: "foo",
                    },
                    bar: {
                        kind: "parsed",
                        parse: numberParser,
                        brief: "bar",
                    },
                },
            },
            docs: { brief: "command brief" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: true },
        });

        // THEN
        testCompletions(
            app,
            [""],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["-"],
            [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["1"],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ],
        );

        testCompletions(app, ["100", "100", "1"], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
    });

    describe("command at root with aliases", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            parse: numberParser,
                            brief: "number",
                            proposeCompletions: () => ["100", "150", "200"],
                        },
                    ],
                },
                flags: {
                    foo: {
                        kind: "boolean",
                        brief: "foo",
                    },
                    bar: {
                        kind: "parsed",
                        parse: numberParser,
                        brief: "bar",
                    },
                },
                aliases: {
                    f: "foo",
                    b: "bar",
                },
            },
            docs: { brief: "command brief" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: true },
        });

        // THEN
        testCompletions(
            app,
            [""],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "-f", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
                { kind: "argument:flag", completion: "-b", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["-"],
            [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "-f", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
                { kind: "argument:flag", completion: "-b", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["1"],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ],
        );

        testCompletions(app, ["100", "100", "1"], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
    });

    describe("command at root with ignored aliases", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: { foo: boolean; bar: number }, arg: number) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            parse: numberParser,
                            brief: "number",
                            proposeCompletions: () => ["100", "150", "200"],
                        },
                    ],
                },
                flags: {
                    foo: {
                        kind: "boolean",
                        brief: "foo",
                    },
                    bar: {
                        kind: "parsed",
                        parse: numberParser,
                        brief: "bar",
                    },
                },
                aliases: {
                    f: "foo",
                    b: "bar",
                },
            },
            docs: { brief: "command brief" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: false },
        });

        // THEN
        testCompletions(
            app,
            [""],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["-"],
            [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ],
        );
        testCompletions(
            app,
            ["1"],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ],
        );

        testCompletions(app, ["100", "100", "1"], []);

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
    });

    describe("nested command", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: { readonly foo: boolean }, arg: number) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [
                        {
                            parse: numberParser,
                            brief: "number",
                            proposeCompletions: () => ["100", "150", "200"],
                        },
                    ],
                },
                flags: {
                    foo: {
                        kind: "boolean",
                        brief: "foo",
                    },
                },
                aliases: {
                    f: "foo",
                },
            },
            docs: { brief: "command brief" },
        });
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: {
                nested: command,
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // THEN
        testCompletions(
            app,
            ["nested"],
            [{ kind: "routing-target:command", completion: "nested", brief: "command brief" }],
        );
        testCompletions(
            app,
            ["nested", ""],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
            ],
        );
        testCompletions(app, ["nested", "-"], [{ kind: "argument:flag", completion: "--foo", brief: "foo" }]);
        testCompletions(
            app,
            ["nested", "1"],
            [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ],
        );

        testCompletions(app, ["-h"], []);
        testCompletions(app, ["--help"], []);
        testCompletions(app, ["-v"], []);
        testCompletions(app, ["--version"], []);
        testCompletions(app, ["nested", "-h"], []);
        testCompletions(app, ["nested", "--help"], []);
    });

    describe("custom integrations", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {},
            docs: { brief: "command brief" },
        });

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
        }, {
            customIntegrationAlpha: {
                flag: {
                    brief: "custom integration alpha flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationBravo: {
                flag: {
                    brief: "custom integration bravo flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            hiddenIntegration: {
                flag: {
                    brief: "hidden integration brief",
                    global: true,
                    hidden: true,
                    complete: true,
                    run: async () => {},
                },
            },
            completionDisabledBrief: {
                flag: {
                    brief: "other integration brief, completion",
                    global: true,
                    complete: false,
                    run: async () => {},
                },
            },
        });

        // THEN
        testCompletions(app, ["-"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["-c"], []);
        testCompletions(app, ["--c"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--customIntegration"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
    });

    describe("custom integrations, include hidden", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {},
            docs: { brief: "command brief" },
        });

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            completion: {
                includeHiddenRoutes: true,
            },
        }, {
            customIntegrationAlpha: {
                flag: {
                    brief: "custom integration alpha flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationBravo: {
                flag: {
                    brief: "custom integration bravo flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            hiddenIntegration: {
                flag: {
                    brief: "hidden integration brief",
                    global: true,
                    hidden: true,
                    complete: true,
                    run: async () => {},
                },
            },
            completionDisabledBrief: {
                flag: {
                    brief: "other integration brief, completion",
                    global: true,
                    complete: false,
                    run: async () => {},
                },
            },
        });

        // THEN
        testCompletions(app, ["-"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--hiddenIntegration", brief: "hidden integration brief" },
        ]);
        testCompletions(app, ["--"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--hiddenIntegration", brief: "hidden integration brief" },
        ]);
        testCompletions(app, ["-c"], []);
        testCompletions(app, ["--c"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--customIntegration"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
    });

    describe("custom integrations with alternate case style", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {},
            docs: { brief: "command brief" },
        });

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            scanner: {
                caseStyle: "allow-kebab-for-camel",
            },
        }, {
            custom: {
                flag: {
                    brief: "custom integration flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationAlpha: {
                flag: {
                    brief: "custom integration alpha flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationBravo: {
                flag: {
                    brief: "custom integration bravo flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
        });

        // THEN
        testCompletions(app, ["-"], [
            { kind: "argument:flag", completion: "--custom", brief: "custom integration flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-alpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-bravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--"], [
            { kind: "argument:flag", completion: "--custom", brief: "custom integration flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-alpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-bravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["-c"], []);
        testCompletions(app, ["--c"], [
            { kind: "argument:flag", completion: "--custom", brief: "custom integration flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-alpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-bravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--customIntegration"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
        ]);
        testCompletions(app, ["--custom-integration"], [
            { kind: "argument:flag", completion: "--custom-integration-alpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--custom-integration-bravo", brief: "custom integration bravo flag brief" },
        ]);
    });

    describe("custom integrations with aliases", () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {},
            docs: { brief: "command brief" },
        });

        // WHEN
        const app = buildApplication(command, {
            name: "cli",
            completion: {
                includeAliases: true,
            },
        }, {
            customIntegrationAlpha: {
                flag: {
                    brief: "custom integration alpha flag brief",
                    aliases: ["c", "a"],
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationBravo: {
                flag: {
                    brief: "custom integration bravo flag brief",
                    aliases: ["C", "b"],
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
            customIntegrationCharlie: {
                flag: {
                    brief: "custom integration charlie flag brief",
                    global: true,
                    complete: true,
                    run: async () => {},
                },
            },
        });

        // THEN
        testCompletions(app, ["-"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "-c", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "-a", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "-C", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "-b", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationCharlie", brief: "custom integration charlie flag brief" },
        ]);
        testCompletions(app, ["--"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationCharlie", brief: "custom integration charlie flag brief" },
        ]);
        testCompletions(app, ["-c"], [
            { kind: "argument:flag", completion: "-c", brief: "custom integration alpha flag brief" },
        ]);
        testCompletions(app, ["--c"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationCharlie", brief: "custom integration charlie flag brief" },
        ]);
        testCompletions(app, ["--customIntegration"], [
            { kind: "argument:flag", completion: "--customIntegrationAlpha", brief: "custom integration alpha flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationBravo", brief: "custom integration bravo flag brief" },
            { kind: "argument:flag", completion: "--customIntegrationCharlie", brief: "custom integration charlie flag brief" },
        ]);
    });
});
