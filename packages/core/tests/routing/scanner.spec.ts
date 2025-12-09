// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import { buildCommand, buildRouteMap, type CommandContext, type ScannerConfiguration } from "../../src";
// eslint-disable-next-line no-restricted-imports
import { CommandSymbol } from "../../src/routing/command/types";
// eslint-disable-next-line no-restricted-imports
import { buildRouteScanner, type RouteNotFoundError, type RouteScanResult } from "../../src/routing/scanner";

function testScan(
    args: Parameters<typeof buildRouteScanner<CommandContext>>,
    inputs: readonly string[],
    expected: RouteScanResult<CommandContext>,
): void {
    it(`scans [${inputs.map((input) => `"${input}"`).join(", ")}] to ${
        expected.target.kind === CommandSymbol ? "command" : "route map"
    } at /${expected.prefix.join("/")} with ${JSON.stringify(args[1])}`, () => {
        const scanner = buildRouteScanner(...args);
        for (const input of inputs) {
            scanner.next(input);
        }
        const result = scanner.finish();
        expect(result).to.deep.equal(expected);
    });
}

function testScanError(
    args: Parameters<typeof buildRouteScanner<CommandContext>>,
    inputs: readonly string[],
    expected: RouteNotFoundError<CommandContext>,
): void {
    it(`scan [${inputs.join(" ")}] fails with ${JSON.stringify(args[1])}`, () => {
        const scanner = buildRouteScanner(...args);
        let error: RouteNotFoundError<CommandContext> | undefined;
        for (const input of inputs) {
            if (error) {
                expect.fail(`Error encountered before end of inputs, did not scan "${input}"`);
            }
            error = scanner.next(input);
        }
        expect(error).to.deep.equal(expected);
    });
}

describe("RouteScanner", () => {
    const defaultScannerConfig: ScannerConfiguration = {
        caseStyle: "original",
        allowArgumentEscapeSequence: false,
        distanceOptions: {
            threshold: 7,
            weights: {
                insertion: 1,
                deletion: 3,
                substitution: 2,
                transposition: 0,
            },
        },
    };

    describe("command at root", () => {
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: {}, ...args: string[]) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "array",
                    parameter: {
                        brief: "",
                        parse: String,
                    },
                },
                flags: {},
            },
            docs: { brief: "top command brief" },
        });

        testScan([command, defaultScannerConfig, ["cli"]], [], {
            helpRequested: false,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["--help"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["-h"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["--help", "--help"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["--helpAll"], {
            helpRequested: "all",
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["-H"], {
            helpRequested: "all",
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["--help", "--helpAll"], {
            helpRequested: "all",
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["foo", "bar", "baz"], {
            helpRequested: false,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["--help", "foo", "bar", "baz"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["foo", "--help", "bar", "baz"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([command, defaultScannerConfig, ["cli"]], ["foo", "bar", "--help", "baz"], {
            helpRequested: true,
            target: command,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
    });

    describe("route map at root", () => {
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
            routes: { doNothing1: subCommand, "do-nothing2": subCommand },
            docs: { brief: "sub route map brief" },
        });
        const topCommand = buildCommand({
            loader: async () => {
                return {
                    default: (flags: {}, ...args: string[]) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "array",
                    parameter: {
                        brief: "",
                        parse: String,
                    },
                },
                flags: {},
            },
            docs: { brief: "top command brief" },
        });
        const routeMap = buildRouteMap({
            routes: {
                command: topCommand,
                camelCase: subRouteMap,
                "kebab-case": subRouteMap,
            },
            docs: {
                brief: "route map brief",
            },
        });

        testScan([routeMap, defaultScannerConfig, ["cli"]], [], {
            helpRequested: false,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["--help"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["-h"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["--help", "command"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: ["command"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["command"], {
            helpRequested: false,
            target: topCommand,
            prefix: ["cli", "command"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["command", "--help"], {
            helpRequested: true,
            target: topCommand,
            prefix: ["cli", "command"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["command", "foo", "bar", "baz"], {
            helpRequested: false,
            target: topCommand,
            prefix: ["cli", "command"],
            rootLevel: false,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["camelCase"], {
            helpRequested: false,
            target: subRouteMap,
            prefix: ["cli", "camelCase"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "--help"], {
            helpRequested: true,
            target: subRouteMap,
            prefix: ["cli", "camelCase"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "doNothing1"], {
            helpRequested: false,
            target: subCommand,
            prefix: ["cli", "camelCase", "doNothing1"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["camelCase", "do-nothing2"], {
            helpRequested: false,
            target: subCommand,
            prefix: ["cli", "camelCase", "do-nothing2"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case"], {
            helpRequested: false,
            target: subRouteMap,
            prefix: ["cli", "kebab-case"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "--help"], {
            helpRequested: true,
            target: subRouteMap,
            prefix: ["cli", "kebab-case"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "doNothing1"], {
            helpRequested: false,
            target: subCommand,
            prefix: ["cli", "kebab-case", "doNothing1"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["kebab-case", "do-nothing2"], {
            helpRequested: false,
            target: subCommand,
            prefix: ["cli", "kebab-case", "do-nothing2"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });

        testScanError([routeMap, defaultScannerConfig, ["cli"]], ["does-not-exist"], {
            input: "does-not-exist",
            routeMap: routeMap,
        });

        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], [], {
            helpRequested: false,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["--help"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["--help-all"], {
            helpRequested: "all",
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["-h"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["--help", "command"],
            {
                helpRequested: true,
                target: routeMap,
                prefix: ["cli"],
                rootLevel: true,
                unprocessedInputs: ["command"],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["command"], {
            helpRequested: false,
            target: topCommand,
            prefix: ["cli", "command"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["command", "--help"],
            {
                helpRequested: true,
                target: topCommand,
                prefix: ["cli", "command"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["command", "foo", "bar", "baz"],
            {
                helpRequested: false,
                target: topCommand,
                prefix: ["cli", "command"],
                rootLevel: false,
                unprocessedInputs: ["foo", "bar", "baz"],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["camelCase"], {
            helpRequested: false,
            target: subRouteMap,
            prefix: ["cli", "camelCase"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["camel-case"], {
            helpRequested: false,
            target: subRouteMap,
            prefix: ["cli", "camel-case"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camelCase", "--help"],
            {
                helpRequested: true,
                target: subRouteMap,
                prefix: ["cli", "camelCase"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camel-case", "--help"],
            {
                helpRequested: true,
                target: subRouteMap,
                prefix: ["cli", "camel-case"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camelCase", "doNothing1"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "camelCase", "doNothing1"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camel-case", "doNothing1"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "camel-case", "doNothing1"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camel-case", "do-nothing-1"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "camel-case", "do-nothing-1"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camelCase", "do-nothing2"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "camelCase", "do-nothing2"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["camel-case", "do-nothing2"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "camel-case", "do-nothing2"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["kebab-case"], {
            helpRequested: false,
            target: subRouteMap,
            prefix: ["cli", "kebab-case"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["kebab-case", "--help"],
            {
                helpRequested: true,
                target: subRouteMap,
                prefix: ["cli", "kebab-case"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["kebab-case", "doNothing1"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "kebab-case", "doNothing1"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["kebab-case", "do-nothing-1"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "kebab-case", "do-nothing-1"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["kebab-case", "do-nothing2"],
            {
                helpRequested: false,
                target: subCommand,
                prefix: ["cli", "kebab-case", "do-nothing2"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );

        testScanError(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["does-not-exist"],
            {
                input: "does-not-exist",
                routeMap: routeMap,
            },
        );
    });

    describe("route map at root with route collision", () => {
        const camelCaseCommand = buildCommand({
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
        const kebabCaseCommand = buildCommand({
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
        const routeMap = buildRouteMap({
            routes: {
                routeName: camelCaseCommand,
                "route-name": kebabCaseCommand,
            },
            docs: {
                brief: "route map brief",
            },
        });

        testScan([routeMap, defaultScannerConfig, ["cli"]], ["routeName"], {
            helpRequested: false,
            target: camelCaseCommand,
            prefix: ["cli", "routeName"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["routeName", "--help"], {
            helpRequested: true,
            target: camelCaseCommand,
            prefix: ["cli", "routeName"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["routeName", "foo", "bar", "baz"], {
            helpRequested: false,
            target: camelCaseCommand,
            prefix: ["cli", "routeName"],
            rootLevel: false,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["route-name"], {
            helpRequested: false,
            target: kebabCaseCommand,
            prefix: ["cli", "route-name"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["route-name", "--help"], {
            helpRequested: true,
            target: kebabCaseCommand,
            prefix: ["cli", "route-name"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["route-name", "foo", "bar", "baz"], {
            helpRequested: false,
            target: kebabCaseCommand,
            prefix: ["cli", "route-name"],
            rootLevel: false,
            unprocessedInputs: ["foo", "bar", "baz"],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });

        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["routeName"], {
            helpRequested: false,
            target: camelCaseCommand,
            prefix: ["cli", "routeName"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["routeName", "--help"],
            {
                helpRequested: true,
                target: camelCaseCommand,
                prefix: ["cli", "routeName"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["routeName", "foo", "bar", "baz"],
            {
                helpRequested: false,
                target: camelCaseCommand,
                prefix: ["cli", "routeName"],
                rootLevel: false,
                unprocessedInputs: ["foo", "bar", "baz"],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan([routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]], ["route-name"], {
            helpRequested: false,
            target: kebabCaseCommand,
            prefix: ["cli", "route-name"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["route-name", "--help"],
            {
                helpRequested: true,
                target: kebabCaseCommand,
                prefix: ["cli", "route-name"],
                rootLevel: false,
                unprocessedInputs: [],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
        testScan(
            [routeMap, { ...defaultScannerConfig, caseStyle: "allow-kebab-for-camel" }, ["cli"]],
            ["route-name", "foo", "bar", "baz"],
            {
                helpRequested: false,
                target: kebabCaseCommand,
                prefix: ["cli", "route-name"],
                rootLevel: false,
                unprocessedInputs: ["foo", "bar", "baz"],
                aliases: { original: [], "convert-camel-to-kebab": [] },
            },
        );
    });

    describe("route map with default command", () => {
        const defaultCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "default command brief" },
        });
        const alternateCommand = buildCommand({
            loader: async () => {
                return {
                    default: () => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "alternate command brief" },
        });
        const routeMap = buildRouteMap({
            routes: {
                default: defaultCommand,
                alternate: alternateCommand,
            },
            defaultCommand: "default",
            docs: {
                brief: "route map brief",
            },
        });

        testScan([routeMap, defaultScannerConfig, ["cli"]], [], {
            helpRequested: false,
            target: defaultCommand,
            prefix: ["cli"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["--help"], {
            helpRequested: true,
            target: routeMap,
            prefix: ["cli"],
            rootLevel: true,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["arg"], {
            helpRequested: false,
            target: defaultCommand,
            prefix: ["cli"],
            rootLevel: false,
            unprocessedInputs: ["arg"],
            aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["--flag"], {
            helpRequested: false,
            target: defaultCommand,
            prefix: ["cli"],
            rootLevel: false,
            unprocessedInputs: ["--flag"],
            aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["default"], {
            helpRequested: false,
            target: defaultCommand,
            prefix: ["cli", "default"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [""], "convert-camel-to-kebab": [""] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["default", "--help"], {
            helpRequested: true,
            target: defaultCommand,
            prefix: ["cli", "default"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [""], "convert-camel-to-kebab": [""] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["defaultx"], {
            helpRequested: false,
            target: defaultCommand,
            prefix: ["cli"],
            rootLevel: false,
            unprocessedInputs: ["defaultx"],
            aliases: { original: ["default"], "convert-camel-to-kebab": ["default"] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["alternate"], {
            helpRequested: false,
            target: alternateCommand,
            prefix: ["cli", "alternate"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
        testScan([routeMap, defaultScannerConfig, ["cli"]], ["alternate", "--help"], {
            helpRequested: true,
            target: alternateCommand,
            prefix: ["cli", "alternate"],
            rootLevel: false,
            unprocessedInputs: [],
            aliases: { original: [], "convert-camel-to-kebab": [] },
        });
    });
});
