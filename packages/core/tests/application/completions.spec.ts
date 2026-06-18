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

async function confirmCompletionsWithStaticContext(app: Application<CommandContext>, inputs: string[], expected: readonly InputCompletion[]) {
    const context = buildFakeContext({ forCommand: false, colorDepth: 2 });
    const completions = await proposeCompletions(app, inputs, context);
    expect(completions).to.have.deep.members(expected);
    expect(context.process.stderr.write.callCount).to.equal(0);
}

async function confirmCompletionsWithDynamicContext(app: Application<CommandContext>, inputs: string[], expected: readonly InputCompletion[]) {
    const context = buildFakeContext({ forCommand: true, colorDepth: 2 });
    const completions = await proposeCompletions(app, inputs, context);
    expect(completions).to.have.deep.members(expected);
    expect(context.process.stderr.write.callCount).to.equal(0);
}

async function confirmNoCompletionsWithErrorLoadingContext(app: Application<CommandContext>, inputs: string[]) {
    const context = buildFakeContext({
        forCommand: () => { throw new Error("This function purposefully throws an error"); },
        colorDepth: void 0,
    });
    await proposeCompletions(app, inputs, context);
    const completions = context.process.stdout.write.args.flat(2)[0]?.split("\n") ?? [];
    expect(completions).to.have.deep.members([]);
    expect(context.process.stderr.write.callCount).to.equal(0);
}

async function confirmCompletions(app: Application<CommandContext>, inputs: string[], expected: readonly InputCompletion[]) {
    await confirmCompletionsWithStaticContext(app, inputs, expected);
    await confirmCompletionsWithDynamicContext(app, inputs, expected);
    await confirmNoCompletionsWithErrorLoadingContext(app, inputs);
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo,bar,baz] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [bar,baz] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [baz] for "baz"', async () => {
            await confirmCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        });
        it('proposes [command] for "baz "', async () => {
            await confirmCompletions(app, ["baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "--help "', async () => {
            await confirmCompletions(app, ["--help", ""], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "--version "', async () => {
            await confirmCompletions(app, ["--version", ""], []);
        });
        it('has no completions for "foo --help"', async () => {
            await confirmCompletions(app, ["foo", "--help"], []);
        });
        it('has no completions for "foo --help "', async () => {
            await confirmCompletions(app, ["foo", "--help", ""], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo,doFoo,bar,b,baz,bz] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ]);
        });
        it('proposes [bar,b,baz,bz] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ]);
        });
        it('proposes [command] for "b "', async () => {
            await confirmCompletions(app, ["b", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });
        it('proposes [baz] for "baz"', async () => {
            await confirmCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        });
        it('proposes [command] for "baz "', async () => {
            await confirmCompletions(app, ["baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });
        it('has no completions for "fake b"', async () => {
            await confirmCompletions(app, ["fake", "b"], []);
        });
        it('has no completions for "fake fake "', async () => {
            await confirmCompletions(app, ["fake", "fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo --help"', async () => {
            await confirmCompletions(app, ["foo", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo,bar,baz] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [bar,baz] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [command] for "b "', async () => {
            await confirmCompletions(app, ["b", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });
        it('proposes [baz] for "baz"', async () => {
            await confirmCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        });
        it('proposes [command] for "baz "', async () => {
            await confirmCompletions(app, ["baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });
        it('has no completions for "fake b"', async () => {
            await confirmCompletions(app, ["fake", "b"], []);
        });
        it('has no completions for "fake fake "', async () => {
            await confirmCompletions(app, ["fake", "fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo --help"', async () => {
            await confirmCompletions(app, ["foo", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo,doFoo,bar,b,baz,bz] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ]);
        });
        it('proposes [bar,b,baz,bz] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
                { kind: "routing-target:route-map", completion: "bz", brief: "baz" },
            ]);
        });
        it('proposes [command] for "b "', async () => {
            await confirmCompletions(app, ["b", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });
        it('proposes [baz] for "baz"', async () => {
            await confirmCompletions(app, ["baz"], [{ kind: "routing-target:route-map", completion: "baz", brief: "baz" }]);
        });
        it('proposes [command] for "baz "', async () => {
            await confirmCompletions(app, ["baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });
        it('has no completions for "fake b"', async () => {
            await confirmCompletions(app, ["fake", "b"], []);
        });
        it('has no completions for "fake fake "', async () => {
            await confirmCompletions(app, ["fake", "fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo --help"', async () => {
            await confirmCompletions(app, ["foo", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo,doFoo,bar,b] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "doFoo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
            ]);
        });
        it('proposes [bar,b] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "b", brief: "bar" },
            ]);
        });
        it('proposes [command] for "b "', async () => {
            await confirmCompletions(app, ["b", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });
        it('has no completions for "baz"', async () => {
            await confirmCompletions(app, ["baz"], []);
        });
        it('proposes [command] for "baz "', async () => {
            await confirmCompletions(app, ["baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });
        it('has no completions for "fake b"', async () => {
            await confirmCompletions(app, ["fake", "b"], []);
        });
        it('has no completions for "fake fake "', async () => {
            await confirmCompletions(app, ["fake", "fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo --help"', async () => {
            await confirmCompletions(app, ["foo", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [fooFlag,barFlag,bazFlag] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "fooFlag", brief: "fooFlag" },
                { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
            ]);
        });
        it('proposes [barFlag,bazFlag] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "barFlag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" },
            ]);
        });
        it('proposes [bazFlag] for "bazFlag"', async () => {
            await confirmCompletions(app, ["bazFlag"], [{ kind: "routing-target:route-map", completion: "bazFlag", brief: "bazFlag" }]);
        });
        it('proposes [command] for "bazFlag "', async () => {
            await confirmCompletions(app, ["bazFlag", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "fooFlag --help"', async () => {
            await confirmCompletions(app, ["fooFlag", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo-flag,bar-flag,baz-flag] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo-flag", brief: "fooFlag" },
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
            ]);
        });
        it('proposes [bar-flag,baz-flag] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "barFlag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" },
            ]);
        });
        it('proposes [baz-flag] for "baz-flag"', async () => {
            await confirmCompletions(app, ["baz-flag"], [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "bazFlag" }]);
        });
        it('proposes [command] for "baz-flag "', async () => {
            await confirmCompletions(app, ["baz-flag", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo-flag --help"', async () => {
            await confirmCompletions(app, ["foo-flag", "--help"], []);
        });
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
        it('has no completions for no inputs', async () => {
            await confirmCompletions(app, [], []);
        });

        it('proposes [foo-flag,bar-flag,baz-flag] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "foo-flag", brief: "foo-flag" },
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
            ]);
        });
        it('proposes [bar-flag,baz-flag] for "b"', async () => {
            await confirmCompletions(app, ["b"], [
                { kind: "routing-target:route-map", completion: "bar-flag", brief: "bar-flag" },
                { kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" },
            ]);
        });
        it('proposes [baz-flag] for "baz-flag"', async () => {
            await confirmCompletions(app, ["baz-flag"], [{ kind: "routing-target:route-map", completion: "baz-flag", brief: "baz-flag" }]);
        });
        it('proposes [command] for "baz-flag "', async () => {
            await confirmCompletions(app, ["baz-flag", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "g"', async () => {
            await confirmCompletions(app, ["g"], []);
        });
        it('has no completions for "fake"', async () => {
            await confirmCompletions(app, ["fake"], []);
        });
        it('has no completions for "fake "', async () => {
            await confirmCompletions(app, ["fake", ""], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "foo-flag --help"', async () => {
            await confirmCompletions(app, ["foo-flag", "--help"], []);
        });
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
        it('proposes [nested] for no inputs', async () => {
            await confirmCompletions(app, [""], [
                { kind: "routing-target:route-map", completion: "nested", brief: "nested route map" }
            ]);
        });
        it('proposes [foo,bar,baz] for "nested "', async () => {
            await confirmCompletions(app, ["nested", ""], [
                { kind: "routing-target:route-map", completion: "foo", brief: "foo" },
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [bar,baz] for "nested b"', async () => {
            await confirmCompletions(app, ["nested", "b"], [
                { kind: "routing-target:route-map", completion: "bar", brief: "bar" },
                { kind: "routing-target:route-map", completion: "baz", brief: "baz" },
            ]);
        });
        it('proposes [command] for "nested baz "', async () => {
            await confirmCompletions(app, ["nested", "baz", ""], [
                { kind: "routing-target:command", completion: "command", brief: "basic command" }
            ]);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "nested --help"', async () => {
            await confirmCompletions(app, ["nested", "--help"], []);
        });
        it('has no completions for "nested foo --help"', async () => {
            await confirmCompletions(app, ["nested", "foo", "--help"], []);
        });
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
        const app = buildApplication<CommandContext>(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: true },
        });

        // THEN
        it('proposes [100,150,200,--foo,--bar] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ]);
        });
        it('proposes [--foo,--bar] for "-"', async () => {
            await confirmCompletions(app, ["-"], [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ]);
        });
        it('proposes [100,150] for "1"', async () => {
            await confirmCompletions(app, ["1"], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ]);
        });

        it('has no completions for "100 100 1"', async () => {
            await confirmCompletions(app, ["100", "100", "1"], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
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
        const app = buildApplication<CommandContext>(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: true },
        });

        // THEN
        it('proposes [100,150,200,--foo,-f,--bar,-b] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "-f", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
                { kind: "argument:flag", completion: "-b", brief: "bar" },
            ]);
        });
        it('proposes [--foo,-f,--bar,-b] for "-"', async () => {
            await confirmCompletions(app, ["-"], [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "-f", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
                { kind: "argument:flag", completion: "-b", brief: "bar" },
            ]);
        });
        it('proposes [100,150] for "1"', async () => {
            await confirmCompletions(app, ["1"], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ]);
        });

        it('has no completions for "100 100 1"', async () => {
            await confirmCompletions(app, ["100", "100", "1"], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
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
        const app = buildApplication<CommandContext>(command, {
            name: "cli",
            versionInfo,
            completion: { includeAliases: false },
        });

        // THEN
        it('proposes [100,150,200,--foo,--bar] for ""', async () => {
            await confirmCompletions(app, [""], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ]);
        });
        it('proposes [--foo,--bar] for "-"', async () => {
            await confirmCompletions(app, ["-"], [
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
                { kind: "argument:flag", completion: "--bar", brief: "bar" },
            ]);
        });
        it('proposes [100,150] for "1"', async () => {
            await confirmCompletions(app, ["1"], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ]);
        });

        it('has no completions for "100 100 1"', async () => {
            await confirmCompletions(app, ["100", "100", "1"], []);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
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
        it('proposes [nested] for "nested"', async () => {
            await confirmCompletions(app, ["nested"], [
                { kind: "routing-target:command", completion: "nested", brief: "command brief" }
            ]);
        });
        it('proposes [100,150,200,--foo] for "nested "', async () => {
            await confirmCompletions(app, ["nested", ""], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
                { kind: "argument:value", completion: "200", brief: "number" },
                { kind: "argument:flag", completion: "--foo", brief: "foo" },
            ]);
        });
        it('proposes [--foo] for "nested -"', async () => {
            await confirmCompletions(app, ["nested", "-"], [{ kind: "argument:flag", completion: "--foo", brief: "foo" }]);
        });
        it('proposes [100,150] for "nested 1"', async () => {
            await confirmCompletions(app, ["nested", "1"], [
                { kind: "argument:value", completion: "100", brief: "number" },
                { kind: "argument:value", completion: "150", brief: "number" },
            ]);
        });

        it('has no completions for "-h"', async () => {
            await confirmCompletions(app, ["-h"], []);
        });
        it('has no completions for "--help"', async () => {
            await confirmCompletions(app, ["--help"], []);
        });
        it('has no completions for "-v"', async () => {
            await confirmCompletions(app, ["-v"], []);
        });
        it('has no completions for "--version"', async () => {
            await confirmCompletions(app, ["--version"], []);
        });
        it('has no completions for "nested -h"', async () => {
            await confirmCompletions(app, ["nested", "-h"], []);
        });
        it('has no completions for "nested --help"', async () => {
            await confirmCompletions(app, ["nested", "--help"], []);
        });
    });
});
