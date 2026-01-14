// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildRouteMap } from "@stricli/core";
import pkg from "../../package.json";
import { installAllCommand, installCommand, uninstallAllCommand, uninstallCommand } from "./commands/spec";

const root = buildRouteMap({
    routes: {
        install: installCommand,
        installAll: installAllCommand,
        uninstall: uninstallCommand,
        uninstallAll: uninstallAllCommand,
    },
    aliases: {
        i: "install",
        I: "installAll",
        u: "uninstall",
        U: "uninstallAll",
    },
    docs: {
        brief: "Manage auto-complete command installations for shells",
    },
});

export const app = buildApplication(root, {
    name: pkg.name,
    /* v8 ignore next -- @preserve */
    versionInfo: {
        getCurrentVersion: async () => pkg.version,
    },
    scanner: {
        caseStyle: "allow-kebab-for-camel",
    },
});
