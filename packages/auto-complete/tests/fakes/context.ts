// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
/* v8 ignore file -- @preserve */
import type { StricliProcess } from "@stricli/core";
import { stub, type SinonStub } from "sinon";
import type { StricliAutoCompleteContext } from "../../src";
import type { SystemDependencies } from "../../src/cli/context";

interface FakeWritable {
    readonly write: SinonStub<[string], void>;
}
interface FakeProcess extends StricliProcess {
    readonly stdout: FakeWritable;
    readonly stderr: FakeWritable;
    readonly exit: (code: number) => void;
}

export class FakeContext implements StricliAutoCompleteContext {
    readonly #process: FakeProcess;
    readonly #files: Map<string, string>;

    constructor(files?: Iterable<[string, string]>, env?: Readonly<Partial<Record<string, string>>>) {
        this.#process = {
            stdout: {
                write: stub(),
            },
            stderr: {
                write: stub(),
            },
            exit: (_code) => {},
            env,
        };
        this.#files = new Map(files);
    }

    get process(): FakeProcess {
        return this.#process;
    }
    get os() {
        return {
            homedir: () => "~",
        };
    }
    get #fspromises() {
        return {
            readFile: (path: string) => {
                if (!this.#files.has(path)) {
                    throw new Error(`cannot access '${path}': No such file or directory`);
                }
                return this.#files.get(path);
            },
            writeFile: (path: string, text: string) => this.#files.set(path, text),
        };
    }
    get fs() {
        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            promises: this.#fspromises as any,
        };
    }

    get files(): ReadonlyMap<string, string> {
        return this.#files;
    }
}
