// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
export class ErrorWithoutStack extends Error {
    readonly code: number;
    override stack = void 0;
    constructor(message?: string, code?: number) {
        super(message);
        this.code = code ?? 1;
    }
}
