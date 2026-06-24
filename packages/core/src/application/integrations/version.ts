// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { VersionInfo } from "../../config";
import { checkEnvironmentVariable, type CommandContext } from "../../context";
import type { AvailableAlias } from "../../parameter/types";
import type { ApplicationFlag, ApplicationHook, LifecycleHooks, StricliIntegration } from "../integration";

/**
 * Options for customizing the behavior of the `version` integration.
 */
export type VersionIntegrationConfiguration = Omit<
    ApplicationFlag<CommandContext>,
    "name" | "aliases" | "global" | "run"
> & {
    /**
     * Single-character shorthand alias for this flag, defaults to `v` if not provided.
     * Set to `false` to disable the alias entirely.
     */
    readonly alias?: AvailableAlias | false;
    /**
     * Values or callbacks to provide the version information for this application. See {@link VersionInfo} for more details.
     * If `getLatestVersion` is provided, this integration will register a lifecycle hook (see {@link VersionIntegrationConfiguration.hook})
     * to check for the latest version of the application and print a warning to stderr if the current version is not the latest.
     */
    readonly info: VersionInfo;
    /**
     * If `getLatestVersion` is provided in {@link VersionIntegrationConfiguration.info}, this option specifies when version check should run.
     * Defaults to `app:start`.
     */
    readonly hook?: keyof LifecycleHooks<CommandContext>;
};

/**
 * This integration provides a `--version` flag on the root command, which prints the current version of the application and exits.
 * It can be customized to provide different behavior; see {@link VersionIntegrationConfiguration} for configuration options.
 */
export function version<CONTEXT extends CommandContext>({
    info,
    alias = "v",
    hook = "app:start",
    ...config
}: VersionIntegrationConfiguration): StricliIntegration<CONTEXT> {
    let versionCheck: ApplicationHook | undefined;
    if (info.getLatestVersion) {
        const getLatestVersion = info.getLatestVersion;
        versionCheck = async function (this, { text, ansiColorByStream }) {
            if (checkEnvironmentVariable(this.process, "STRICLI_SKIP_VERSION_CHECK")) {
                return;
            }
            let currentVersion: string;
            if ("currentVersion" in info) {
                currentVersion = info.currentVersion;
            } else {
                currentVersion = await info.getCurrentVersion.call(this);
            }
            const latestVersion = await getLatestVersion.call(this, currentVersion);
            if (latestVersion && currentVersion !== latestVersion) {
                const warningMessage = text.currentVersionIsNotLatest({
                    currentVersion,
                    latestVersion,
                    upgradeCommand: info.upgradeCommand,
                    ansiColor: ansiColorByStream.stderr,
                });
                this.process.stderr.write(
                    ansiColorByStream.stderr
                        ? `\x1B[1m\x1B[33m${warningMessage}\x1B[39m\x1B[22m\n`
                        : `${warningMessage}\n`,
                );
            }
        };
    }

    return {
        hooks: versionCheck ? { [hook]: versionCheck } : {},
        flag: {
            ...config,
            defaultForRouteMap: false,
            global: false,
            aliases: alias === false ? [] : [alias],
            async run(this) {
                let currentVersion: string;
                if ("currentVersion" in info) {
                    currentVersion = info.currentVersion;
                } else {
                    currentVersion = await info.getCurrentVersion.call(this);
                }
                this.process.stdout.write(currentVersion + "\n");
            },
        },
    };
}
