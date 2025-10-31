// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { expect } from "chai";
import { buildCommand, buildRouteMap, numberParser, text_en, type CommandContext, type RouteMap } from "../../src";
// eslint-disable-next-line no-restricted-imports
import type { HelpFormattingArguments } from "../../src/routing/types";
import { compareToBaseline, StringArrayBaselineFormat } from "../baseline";

function compareHelpTextToBaseline(
    routeMap: RouteMap<CommandContext>,
    args: Omit<HelpFormattingArguments, "ansiColor">,
) {
    it("with ANSI color", function () {
        // WHEN
        const helpText = routeMap.formatHelp({
            ...args,
            ansiColor: true,
        });

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, helpText.split("\n"));
    });

    it("no ANSI color", function () {
        // WHEN
        const helpText = routeMap.formatHelp({
            ...args,
            ansiColor: false,
        });

        // THEN
        compareToBaseline(this, StringArrayBaselineFormat, helpText.split("\n"));
    });

    it("text with ANSI matches text without ANSI", function () {
        // WHEN
        const helpTextWithAnsiColor = routeMap.formatHelp({
            ...args,
            ansiColor: true,
        });
        const helpTextWithAnsiColorStrippedOut = helpTextWithAnsiColor.replace(/\x1B\[[0-9;]*m/g, "");
        const helpTextWithoutAnsiColor = routeMap.formatHelp({
            ...args,
            ansiColor: false,
        });

        // THEN
        expect(helpTextWithAnsiColorStrippedOut).to.deep.equal(helpTextWithoutAnsiColor);
    });
}

describe("RouteMap", () => {
    it("builder enforces at least one route", () => {
        // WHEN
        expect(() => {
            buildRouteMap({
                routes: {},
                docs: { brief: "route map with no routes" },
            });
        }).to.throw("Route map must contain at least one route");
    });

    it("builder enforces aliases do not collide with route names", () => {
        // WHEN
        expect(() => {
            buildRouteMap({
                routes: {
                    alpha: buildCommand({
                        loader: async () => {
                            return { default: () => {} };
                        },
                        parameters: {
                            flags: {},
                            positional: {
                                kind: "tuple",
                                parameters: [],
                            },
                        },
                        docs: {
                            brief: "",
                        },
                    }),
                },
                aliases: {
                    alpha: "alpha",
                },
                docs: { brief: "route map with colliding alias" },
            });
        }).to.throw('Cannot use "alpha" as an alias when a route with that name already exists');
    });

    it("builder enforces default command is not a route map", () => {
        // WHEN
        expect(() => {
            buildRouteMap({
                routes: {
                    sub: buildRouteMap({
                        routes: {
                            foo: buildCommand({
                                loader: async () => {
                                    return { default: () => {} };
                                },
                                parameters: {
                                    flags: {},
                                    positional: {
                                        kind: "tuple",
                                        parameters: [],
                                    },
                                },
                                docs: {
                                    brief: "",
                                },
                            }),
                        },
                        docs: {
                            brief: "nested route map",
                        },
                    }),
                },
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                defaultCommand: "sub" as any,
                docs: { brief: "route map with invalid default command" },
            });
        }).to.throw('Cannot use "sub" as the default command because it is not a Command');
    });

    describe("printHelp", () => {
        const defaultArgs: HelpFormattingArguments = {
            prefix: ["prefix"],
            aliases: [],
            config: {
                alwaysShowHelpAllFlag: false,
                caseStyle: "original",
                useAliasInUsageLine: false,
                onlyRequiredInUsageLine: false,
                disableAnsiColor: true,
            },
            text: text_en,
            includeVersionFlag: false,
            includeArgumentEscapeSequenceFlag: false,
            includeHelpAllFlag: false,
            includeHidden: false,
            ansiColor: false,
            env: void 0,
        };

        // GIVEN
        const subCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "sub command brief" },
        });
        const subRouteMap = buildRouteMap({
            routes: { doNothing1: subCommand, doNothing2: subCommand },
            docs: { brief: "sub route map brief" },
        });
        const topCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "top command brief" },
        });

        describe("nested route map", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                },
            });

            compareHelpTextToBaseline(routeMap, defaultArgs);
        });

        describe("nested route map with version available", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                    fullDescription: "Longer description of this route map's behavior, only printed during --help",
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                includeVersionFlag: true,
            });
        });

        describe("nested route map with aliases", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
            });
        });

        describe("aliased nested route map with aliases", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                prefix: ["cli", "alias1"],
                includeVersionFlag: true,
                aliases: ["route", "alias2"],
            });
        });

        describe("nested route map with hidden routes", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                    hideRoute: {
                        sub: true,
                    },
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                includeVersionFlag: true,
            });
        });

        describe("nested route map force include hidden routes", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                    hideRoute: {
                        sub: true,
                    },
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                includeVersionFlag: true,
                includeHidden: true,
            });
        });

        describe("nested route map with `convert-camel-to-kebab` display case style", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                    fullDescription: "Longer description of this route map's behavior, only printed during --help",
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                includeVersionFlag: true,
                config: {
                    ...defaultArgs.config,
                    caseStyle: "convert-camel-to-kebab",
                },
            });
        });

        describe("nested route maps with custom header text", function () {
            // GIVEN
            const routeMap = buildRouteMap({
                routes: { doNothing: topCommand, sub: subRouteMap },
                docs: {
                    brief: "route map brief",
                },
            });

            compareHelpTextToBaseline(routeMap, {
                ...defaultArgs,
                prefix: ["cli", "route"],
                includeVersionFlag: true,
                aliases: ["alias1", "alias2"],
                text: {
                    ...defaultArgs.text,
                    headers: {
                        ...defaultArgs.text.headers,
                        usage: "Usage:",
                        aliases: "Aliases:",
                        flags: "Flags:",
                        commands: "Commands:",
                    },
                },
            });
        });
    });

    describe("getSubcommandWithName", () => {
        it("finds registered Command", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: () => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });
            const routeMap = buildRouteMap({
                routes: { doNothing: command },
                docs: { brief: "route map brief" },
            });

            // WHEN
            const resolvedSubcommand = routeMap.getRoutingTargetForInput("doNothing");

            // THEN
            expect(resolvedSubcommand).to.equal(command);
        });

        it("finds registered Command via alias", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: () => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });
            const routeMap = buildRouteMap({
                routes: { doNothing: command },
                docs: { brief: "route map brief" },
                aliases: { nothing: "doNothing" },
            });

            // WHEN
            const resolvedSubcommand = routeMap.getRoutingTargetForInput("nothing");

            // THEN
            expect(resolvedSubcommand).to.equal(command);
        });

        it("finds registered RouteMap", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: () => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });
            const emptyRouteMap = buildRouteMap({
                routes: {
                    command,
                },
                docs: { brief: "empty route map" },
            });
            const routeMap = buildRouteMap({
                routes: { empty: emptyRouteMap },
                docs: { brief: "route map brief" },
            });

            // WHEN
            const resolvedSubcommand = routeMap.getRoutingTargetForInput("empty");

            // THEN
            expect(resolvedSubcommand).to.equal(emptyRouteMap);
        });

        it("finds registered RouteMap via alias", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: () => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });
            const emptyRouteMap = buildRouteMap({
                routes: {
                    command,
                },
                docs: { brief: "empty route map" },
            });
            const routeMap = buildRouteMap({
                routes: { empty: emptyRouteMap },
                docs: { brief: "route map brief" },
                aliases: { sub: "empty" },
            });

            // WHEN
            const resolvedSubcommand = routeMap.getRoutingTargetForInput("sub");

            // THEN
            expect(resolvedSubcommand).to.equal(emptyRouteMap);
        });

        it("does not find unregistered name", () => {
            // GIVEN
            const command = buildCommand({
                loader: async () => {
                    return {
                        default: () => {},
                    };
                },
                parameters: {
                    positional: { kind: "tuple", parameters: [] },
                    flags: {},
                },
                docs: { brief: "brief" },
            });
            const emptyRouteMap = buildRouteMap({ routes: { command }, docs: { brief: "empty route map" } });

            // WHEN
            const resolvedSubcommand = emptyRouteMap.getRoutingTargetForInput("missing");

            // THEN
            expect(resolvedSubcommand).to.be.undefined;
        });
    });
});
