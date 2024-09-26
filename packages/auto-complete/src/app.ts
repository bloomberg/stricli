// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { buildApplication, buildRouteMap } from "@stricli/core";
import { installCommand, uninstallCommand } from "./commands";
import pkg from "../package.json";

const root = buildRouteMap({
    routes: {
        install: installCommand,
        uninstall: uninstallCommand,
    },
    aliases: {
        i: "install",
    },
    docs: {
        brief: "Manage auto-complete command installations for shells",
    },
});

export const app = buildApplication(root, {
    name: pkg.name,
    versionInfo: {
        getCurrentVersion: async () => pkg.version,
    },
});
