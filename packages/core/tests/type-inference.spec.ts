// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

// The following tests exist to validate the type inference and type checking of the framework.
// They do not test any runtime behavior and do not need to be executed as part of the test suite.

import { it } from "vitest";
import { buildCommand, buildRouteMap, numberParser, type CommandContext, type TypedFlagParameter } from "../src";

it("", () => {
    type Flags = { foo: boolean };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func({ foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo: {
                    brief: "",
                    kind: "boolean",
                },
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const foo: TypedFlagParameter<boolean> = {
        brief: "",
        kind: "boolean",
    };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func({ foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo,
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func(this: CommandContext, { foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo: {
                    brief: "",
                    kind: "boolean",
                },
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func: function ({ foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo: {
                    brief: "",
                    kind: "boolean",
                },
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const foo: TypedFlagParameter<boolean> = {
        brief: "",
        kind: "boolean",
    };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func: function ({ foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo,
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func: function (this: CommandContext, { foo }: Flags) {
            this.process.stdout.write(`foo=${foo}`);
        },
        parameters: {
            flags: {
                foo: {
                    brief: "",
                    kind: "boolean",
                },
            },
        },
    });
});

it("", () => {
    type Flags = { foo: boolean };
    const func = function (this: CommandContext, { foo }: Flags) {
        this.process.stdout.write(`foo=${foo}`);
    };
    const command = buildCommand({
        docs: {
            brief: "",
        },
        func,
        parameters: {
            flags: {
                foo: {
                    brief: "",
                    kind: "boolean",
                },
            },
        },
    });
});

it("", () => {
    interface CustomContext extends CommandContext {
        readonly __custom__: symbol;
    }

    const command = buildCommand({
        loader: async () => {
            return { default(this: CustomContext) {} };
        },
        parameters: {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [],
            },
        },
        docs: {
            brief: "",
        },
    });

    // This is not a runtime test and will fail to compile if inference is broken
    buildRouteMap({
        routes: {
            alpha: command,
            bravo: command,
        },
        defaultCommand: "alpha",
        docs: { brief: "route map with custom context" },
    });
});

it("", () => {
    // This is not a runtime test and will fail to compile if inference is broken
    buildCommand({
        func: async (flags: unknown, ...args: unknown[]) => {},
        parameters: {
            flags: {},
            positional: {
                kind: "array",
                parameter: {
                    brief: "",
                    parse: String,
                    optional: true,
                },
            },
        },
        docs: {
            brief: "",
        },
    });
});

it("", () => {
    buildCommand({
        func: async (flags: any, ...args: any[]) => {},
        parameters: {
            flags: {},
            positional: {
                kind: "array",
                parameter: {
                    brief: "",
                    parse: String,
                    optional: true,
                },
            },
        },
        docs: {
            brief: "",
        },
    });
});

it("", () => {
    const command = buildCommand({
        func: async (flags: { count?: number }, text: string) => {},
        parameters: {
            flags: {
                count: {
                    brief: "",
                    kind: "parsed",
                    parse: numberParser,
                    optional: true,
                },
            },
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        brief: "",
                        parse: String,
                    },
                ],
            },
        },
        docs: {
            brief: "",
        },
    });
});

it("", () => {
    const command = buildCommand({
        func: async (flags: { count?: number }) => {},
        // @ts-expect-error flag definition is still required even if the flag is optional at runtime and it has to be defined in parameters
        parameters: {},
        docs: {
            brief: "",
        },
    });
});

it("", () => {
    const command = buildCommand({
        func: async (flags: { count?: number }) => {},
        parameters: {
            // @ts-expect-error flag definition is still required even if the flag is optional at runtime
            flags: {},
        },
        docs: {
            brief: "",
        },
    });
});

// Issue #91 - aliases with func and explicit type annotations
it("", () => {
    const command = buildCommand({
        func: async (flags: { repo?: string }) => {},
        parameters: {
            flags: {
                repo: {
                    brief: "",
                    kind: "parsed",
                    parse: String,
                    optional: true,
                },
            },
            aliases: {
                r: "repo",
            },
        },
        docs: {
            brief: "",
        },
    });
});

it("", () => {
    const command = buildCommand({
        func: async (flags: { output?: string; input?: string }) => {},
        parameters: {
            flags: {
                output: {
                    brief: "",
                    kind: "parsed",
                    parse: String,
                    optional: true,
                },
                input: {
                    brief: "",
                    kind: "parsed",
                    parse: String,
                    optional: true,
                },
            },
            aliases: {
                o: "output",
                i: "input",
            },
        },
        docs: {
            brief: "",
        },
    });
});

// Negative test - invalid alias target should still error when FLAGS can be inferred
it("", () => {
    buildCommand({
        func: async (flags: { repo?: string }) => {},
        parameters: {
            flags: {
                repo: {
                    brief: "",
                    kind: "parsed",
                    parse: String,
                    optional: true,
                },
            },
            // @ts-expect-error "nonexistent" is not a valid flag name
            aliases: {
                r: "nonexistent",
            },
        },
        docs: {
            brief: "",
        },
    });
});

// Edge case - when func has no flag parameters, any alias target is allowed at type level
it("", () => {
    buildCommand({
        func: async () => {},
        parameters: {
            flags: {},
            positional: {
                kind: "tuple",
                parameters: [],
            },
            // When FLAGS is empty and func has no flag params,
            // aliases can point to anything (type system limitation - runtime validation still applies)
            aliases: {
                r: "repo",
            },
        },
        docs: {
            brief: "",
        },
    });
});
