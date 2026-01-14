// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export {
    buildAutocompleteRouteMap,
    buildInstallCommand,
    buildUnifiedAutocompleteRouteMap,
    buildUnifiedInstallCommand,
    buildUnifiedUninstallCommand,
    buildUninstallCommand,
} from "./builders";
export type { StricliAutoCompleteContext } from "./cli/context";
export { handleCompletionsForShell } from "./handler";
export type { Shell } from "./shells";
