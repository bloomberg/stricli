// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import child_process from "node:child_process";

export function discoverPackageRegistry(process: NodeJS.Process): string | undefined {
    if (process.env["NPM_CONFIG_REGISTRY"]) {
        return process.env["NPM_CONFIG_REGISTRY"];
    }

    if (process.env["NPM_EXECPATH"]) {
        return child_process
            .execFileSync(process.execPath, [process.env["NPM_EXECPATH"], "config", "get", "registry"], {
                encoding: "utf-8",
            })
            .trim();
    }
}

export async function fetchPackageVersions(
    registry: string,
    packageName: string,
): Promise<readonly string[] | undefined> {
    const input = registry + (registry.endsWith("/") ? packageName : `/${packageName}`);
    const response = await fetch(input);
    const data = await response.json();
    if (typeof data === "object" && data && "versions" in data && typeof data.versions === "object") {
        return Object.keys(data.versions ?? {});
    }
}
