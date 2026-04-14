// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export { buildFakeContext, type FakeContext, type FakeContextOptions } from "./fakes/context";
export { buildFakeProcess, type FakeProcess, type FakeProcessOptions } from "./fakes/process";
export { FakeTerminal, type FakeWritableStream } from "./fakes/terminal";
export { buildProcessResultSerializer, type ProcessResult } from "./serializers/process";
export { buildWorkspaceResultSerializer, type WorkspaceResult } from "./serializers/workspace";

