// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FunctionThisType<T> = T extends (this: infer U, ...args: any[]) => any ? U : never;
