// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
type FakeWritableStream = {
    readonly write: (str: string) => void;
    readonly clearLine: () => void;
    readonly cursorTo: () => void;
};

export class FakeTerminal {
    // brand needed for serializer test, as instanceof doesn't work when loaded globally
    private readonly __FakeTerminal = void 0;
    #active: "stdout" | "stderr" = "stdout";
    #line: string = "";
    #lines: string[] = [];
    write(stream: "stdout" | "stderr", str: string): void {
        if (this.#active !== stream) {
            if (this.#line) {
                this.#lines.push(`[${this.#active}] ${this.#line}\n`);
            }
            this.#line = "";
            this.#active = stream;
        }
        const lines = str.split("\n");
        if (lines.length > 1) {
            const line0 = lines.at(0)!;
            this.#lines.push(`[${stream}] ${this.#line}${line0}\n`);
        }
        this.#lines.push(...lines.slice(1, -1).map((line) => `[${stream}] ${line}\n`));
        this.#line = lines.at(-1)!;
    }
    get stdout(): FakeWritableStream {
        return {
            write: (str) => {
                this.write("stdout", str);
            },
            clearLine() {
                throw new Error("clearLine is not supported on FakeTerminal");
            },
            cursorTo() {
                throw new Error("cursorTo is not supported on FakeTerminal");
            },
        };
    }
    get stderr(): FakeWritableStream {
        return {
            write: (str) => {
                this.write("stderr", str);
            },
            clearLine() {
                throw new Error("clearLine is not supported on FakeTerminal");
            },
            cursorTo() {
                throw new Error("cursorTo is not supported on FakeTerminal");
            },
        };
    }
    serialize() {
        const lines = [...this.#lines];
        if (this.#line) {
            lines.push(`[${this.#active}] ${this.#line}`);
        }
        return lines
            .join("")
            .split("\n")
            .map((line) => line.trimEnd())
            .join("\n");
    }
}
