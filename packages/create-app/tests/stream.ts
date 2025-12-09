// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
export class FakeWritableStream {
    #text: string[] = [];
    write(str: string): void {
        this.#text.push(str);
    }
    get text(): string {
        return this.#text.join("");
    }
}
