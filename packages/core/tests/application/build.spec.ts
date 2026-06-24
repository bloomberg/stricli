// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { describe, expect, it } from "vitest";
import { buildApplication, buildCommand, buildRouteMap, text_en, type VersionInfo } from "../../src";
import { buildBasicRouteMap, buildRouteMapForFakeContext } from "../application";

describe("buildApplication", () => {
    it("allows `allow-kebab-for-camel` parse case style with `original` display case style", () => {
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
        buildApplication(rootRouteMap, {
            name: "cli",
            versionInfo,
            scanner: {
                caseStyle: "allow-kebab-for-camel",
            },
            documentation: {
                caseStyle: "original",
            },
        });
    });

    it("fails on `original` parse case style with `convert-camel-to-kebab` display case style", async () => {
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
        expect(() =>
            buildApplication(rootRouteMap, {
                name: "cli",
                versionInfo,
                scanner: {
                    caseStyle: "original",
                },
                documentation: {
                    caseStyle: "convert-camel-to-kebab",
                },
            }),
        ).to.throw("Cannot convert route and flag names on display (convert-camel-to-kebab) but scan as original");
    });

    it("fails if root command uses --help flag", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { help: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    help: {
                        brief: "help",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
            }),
        ).to.throw(`'help' integration provides a flag that would override: "--help"`);
    });

    it("fails if nested command uses --help flag", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { help: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    help: {
                        brief: "help",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });
        const root = buildRouteMap({
            routes: {
                command,
            },
            docs: {
                brief: "basic route map",
            },
        });

        // WHEN
        expect(() =>
            buildApplication(root, {
                name: "cli",
            }),
        ).to.throw(`'help' integration provides a flag that would override: "command --help"`);
    });

    it("fails if root command uses --helpAll flag", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { helpAll: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    helpAll: {
                        brief: "helpAll",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
            }),
        ).to.throw(`'helpAll' integration provides a flag that would override: "--helpAll"`);
    });

    it("allows root command to use --help-all flag with original case style", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { "help-all": boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    "help-all": {
                        brief: "help-all",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        buildApplication(command, {
            name: "cli",
        });
    });

    it("fails if root command uses --help-all flag with allow-kebab-for-camel case style", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { "help-all": boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    "help-all": {
                        brief: "help-all",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
                scanner: {
                    caseStyle: "allow-kebab-for-camel",
                },
            }),
        ).to.throw(`'helpAll' integration provides a flag that would override: "--helpAll"`);
    });

    it("allows root command using --version flag without version info", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { version: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    version: {
                        brief: "version",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        buildApplication(command, {
            name: "cli",
        });
    });

    it("fails if root command uses --version flag when providing version info", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { version: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    version: {
                        brief: "version",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
                versionInfo,
            }),
        ).to.throw(`'version' integration provides a flag that would override: "--version"`);
    });

    it("allows root command using -v alias without version info", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { verbose: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    verbose: {
                        brief: "verbose",
                        kind: "boolean",
                    },
                },
                aliases: {
                    v: "verbose",
                },
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        buildApplication(command, {
            name: "cli",
        });
    });

    it("fails if root command uses -v alias when providing version info", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { verbose: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    verbose: {
                        brief: "verbose",
                        kind: "boolean",
                    },
                },
                aliases: {
                    v: "verbose",
                },
            },
            docs: {
                brief: "basic command",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
                versionInfo,
            }),
        ).to.throw(`'version' integration provides a flag with an alias that would override: "-v"`);
    });

    it("allows nested command to use --version flag when providing version info", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: { version: boolean }) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {
                    version: {
                        brief: "version",
                        kind: "boolean",
                    },
                },
            },
            docs: {
                brief: "basic command",
            },
        });
        const versionInfo: VersionInfo = {
            currentVersion: "1.0.0",
        };
        const root = buildRouteMap({
            routes: {
                command,
            },
            docs: {
                brief: "basic route map",
            },
        });

        // WHEN
        buildApplication(root, {
            name: "cli",
            versionInfo,
        });
    });

    it("fails if no text for default locale", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: {}) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {},
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        expect(() =>
            buildApplication(command, {
                name: "cli",
                localization: {
                    loadText: (): undefined => {
                        return;
                    },
                },
            }),
        ).to.throw('No text available for the default locale "en"');
    });

    it("default text with no loader disables locale support", async () => {
        // GIVEN
        const command = buildCommand({
            loader: async () => {
                return {
                    default: async (flags: {}) => {},
                };
            },
            parameters: {
                positional: {
                    kind: "tuple",
                    parameters: [],
                },
                flags: {},
            },
            docs: {
                brief: "basic command",
            },
        });

        // WHEN
        buildApplication(command, {
            name: "cli",
            localization: {
                text: text_en,
            },
        });
    });
});
