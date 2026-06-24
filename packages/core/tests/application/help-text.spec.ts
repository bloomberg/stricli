// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import {
    buildApplication,
    buildCommand,
    generateHelpTextForAllCommands,
    text_en,
    type CommandContext,
    type VersionInfo,
} from "../../src";
import { buildBasicCommand, buildBasicRouteMap, buildRouteMapForFakeContext } from "../application";
import { buildFakeApplicationText } from "../fakes/config";
import { documentedCommandArraySerializer } from "../snapshot-serializers";

// Register custom snapshot serializers
expect.addSnapshotSerializer(documentedCommandArraySerializer);

describe("generateHelpTextForAllCommands", () => {
    it("route map at root", async () => {
        // GIVEN
        const routeMap = buildBasicRouteMap("root");
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(routeMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("nested route map", async () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: buildBasicRouteMap("sub") },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("nested route map skips hidden routes", async () => {
        // GIVEN
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: buildBasicRouteMap("sub") },
            docs: { brief: "root route map", hideRoute: { sub: true } },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("nested command, with aliases", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: command },
            aliases: {
                alias1: "sub",
                alias2: "sub",
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("nested commands", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub1: command, sub2: command },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("nested commands, with aliases", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub1: command, sub2: command },
            aliases: {
                alias1: "sub1",
                alias2: "sub2",
            },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("multiple commands at different levels", async () => {
        // GIVEN
        const command = buildBasicCommand();
        const subRouteMap = buildRouteMapForFakeContext({
            routes: { command: command },
            docs: { brief: "sub route map" },
        });
        const rootRouteMap = buildRouteMapForFakeContext({
            routes: { sub: subRouteMap, command: command },
            docs: { brief: "root route map" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("command at root", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: Record<string, never>) => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "command brief" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication<CommandContext>(command, {
            name: "cli",
            versionInfo,
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("command at root, with usage config", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: Record<string, never>) => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "command brief" },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const app = buildApplication(command, {
            name: "cli",
            versionInfo,

            documentation: {
                useAliasInUsageLine: true,
            },
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("fails with missing locale", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: Record<string, never>) => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "command brief" },
        });
        const app = buildApplication(command, {
            name: "cli",
            documentation: {
                useAliasInUsageLine: true,
            },
        });

        // WHEN
        expect(() => {
            generateHelpTextForAllCommands(app, "fake");
        }).to.throw(`Application does not support "fake" locale`);
    });

    it("command at root, with alternate locale", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: Record<string, never>) => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "command brief" },
        });
        const fakeText = buildFakeApplicationText();
        const app = buildApplication(command, {
            name: "cli",
            localization: {
                loadText: (locale) => {
                    return { en: text_en, fake: fakeText }[locale];
                },
            },
            documentation: {
                useAliasInUsageLine: true,
            },
        });

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app, "fake");

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });

    it("custom integration", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: (flags: Record<string, never>) => {},
                };
            },
            parameters: {
                positional: { kind: "tuple", parameters: [] },
                flags: {},
            },
            docs: { brief: "command brief" },
        });
        const app = buildApplication(
            command,
            {
                name: "cli",
            },
            {
                customIntegration: {
                    flag: {
                        brief: "custom integration flag brief",
                        global: true,
                        run: async () => {},
                    },
                },
            },
        );

        // WHEN
        const documentedCommands = generateHelpTextForAllCommands(app);

        // THEN
        expect(documentedCommands).toMatchSnapshot();
    });
});
