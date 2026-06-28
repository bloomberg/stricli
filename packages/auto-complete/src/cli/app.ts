// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildRouteMap } from "@stricli/core";
import pkg from "../../package.json";
import { installCommand, unifiedInstallCommand, unifiedUninstallCommand, uninstallCommand } from "./spec";

const root = buildRouteMap({
    routes: {
        install: installCommand,
        uninstall: uninstallCommand,
        unified: buildRouteMap({
            routes: {
                install: unifiedInstallCommand,
                uninstall: unifiedUninstallCommand,
            },
            aliases: {
                i: "install",
                u: "uninstall",
            },
            docs: {
                brief: "Manage autocomplete support for all supported shells",
            },
        }),
    },
    aliases: {
        i: "install",
        u: "uninstall",
    },
    docs: {
        brief: "Manage autocomplete support for Stricli applications",
    },
});

export const app = buildApplication(root, {
    name: pkg.name,
    /* v8 ignore next -- @preserve */
    versionInfo: {
        currentVersion: pkg.version,
    },
    scanner: {
        caseStyle: "allow-kebab-for-camel",
    },
});
