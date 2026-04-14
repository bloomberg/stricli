// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
export type FakeWritableStream = {
    readonly write: (str: string) => void;
    readonly getColorDepth?: () => number;
};

type StreamKind = "stdout" | "stderr";
type StreamLine = readonly [kind: StreamKind, text: string];

export class FakeTerminal {
    // brand needed for serializer test, as instanceof doesn't work when loaded globally
    private readonly __FakeTerminal = void 0;
    static isFakeTerminal(val: unknown): val is FakeTerminal {
        return Boolean(val && typeof val === "object" && "__FakeTerminal" in val);
    }
    #line: StreamLine = ["stdout", ""];
    readonly #lines: StreamLine[] = [];
    write(stream: StreamKind, str: string): void {
        if (this.#line[0] !== stream) {
            if (this.#line[1]) {
                this.#lines.push(this.#line);
            }
            this.#line = [stream, ""];
        }
        const lines = str.split("\n");
        if (lines.length > 1) {
            const line0 = lines.at(0)!;
            this.#lines.push([stream, `${this.#line[1]}${line0}`]);
        }
        this.#lines.push(...lines.slice(1, -1).map((line) => [stream, line] as StreamLine));
        this.#line = [stream, lines.at(-1)!];
    }
    stdout(options: { colorDepth?: number }): FakeWritableStream {
        return {
            write: (str) => this.write("stdout", str),
            ...(options.colorDepth
                ? {
                      getColorDepth() {
                          return options.colorDepth!;
                      },
                  }
                : {}),
        };
    }
    stderr(options: { colorDepth?: number }): FakeWritableStream {
        return {
            write: (str) => this.write("stderr", str),
            ...(options.colorDepth
                ? {
                      getColorDepth() {
                          return options.colorDepth!;
                      },
                  }
                : {}),
        };
    }
    toString(stream?: StreamKind): string {
        let lines = [...this.#lines];
        if (this.#line[1]) {
            lines.push(this.#line);
        }
        if (stream) {
            lines = lines.filter(([kind]) => kind === stream);
        }
        return lines.map(([, text]) => text).join("\n");
    }
    serialize() {
        const lines = [...this.#lines];
        if (this.#line[1]) {
            lines.push(this.#line);
        }
        return lines
            .map(([kind, text]) => `[${kind}] ${text}`)
            .join("\n")
            .split("\n")
            .map((line) => line.trimEnd())
            .join("\n");
    }
}
