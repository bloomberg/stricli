// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import { discoverPackageRegistry, fetchPackageVersions } from "./registry";

export interface NodeVersions {
    readonly engine: string;
    readonly types: string;
}

const MAXIMUM_KNOWN_SAFE_NODE_TYPES_VERSION = 22;

export async function calculateAcceptableNodeVersions(process: NodeJS.Process): Promise<NodeVersions> {
    const majorVersion = Number(process.versions.node.split(".")[0]);
    let typesVersion: string | undefined;

    if (majorVersion > MAXIMUM_KNOWN_SAFE_NODE_TYPES_VERSION) {
        // To avoid hitting the registry every time, only run when higher than a statically-known maximum safe value.
        const registry = discoverPackageRegistry(process);
        const versions = registry && (await fetchPackageVersions(registry, "@types/node"));
        if (versions?.includes(process.versions.node)) {
            typesVersion = `^${process.versions.node}`;
        } else if (versions) {
            const typeMajors = new Set(versions.map((version) => Number(version.split(".")[0])));
            if (typeMajors.has(majorVersion)) {
                // Previously unknown major version exists, which means MAXIMUM_KNOWN_SAFE_NODE_TYPES_VERSION should be updated.
                typesVersion = `${majorVersion}.x`;
            } else {
                // Filter available major versions to just even (LTS) and pick highest.
                // This assumes that types will exist for the LTS version just prior to the current unknown major version.
                const highestEvenTypeMajor = [...typeMajors]
                    .filter((major) => major % 2 === 0)
                    .toSorted()
                    .at(-1);
                if (highestEvenTypeMajor) {
                    typesVersion = `${highestEvenTypeMajor}.x`;
                    process.stderr.write(
                        `No version of @types/node found with major ${majorVersion}, falling back to ${typesVersion}\n`,
                    );
                    process.stderr.write(
                        `Rerun this command with the hidden flag --node-version to manually specify the Node.js major version`,
                    );
                }
            }
        }
    } else {
        typesVersion = `${majorVersion}.x`;
    }

    if (!typesVersion) {
        typesVersion = `${majorVersion}.x`;
        // Should only be hit if something went wrong determining registry URL or fetching from registry.
        process.stderr.write(
            `Unable to determine version of @types/node for ${process.versions.node}, assuming ${typesVersion}\n`,
        );
        process.stderr.write(
            `Rerun this command with the hidden flag --node-version to manually specify the Node.js major version`,
        );
    }

    return {
        engine: `>=${majorVersion}`,
        types: typesVersion,
    };
}
