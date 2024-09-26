// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { ApplicationConfiguration } from "../config";
import type { ApplicationText } from "../text";
import type { CommandContext } from "../context";
import type { RoutingTarget } from "../routing/types";

/**
 * Interface for top-level command line application.
 */
export interface Application<CONTEXT extends CommandContext> {
    readonly root: RoutingTarget<CONTEXT>;
    readonly config: ApplicationConfiguration;
    readonly defaultText: ApplicationText;
}
