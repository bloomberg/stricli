// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

// The following tests exist to validate the type inference and type checking of the framework.
// They do not test any runtime behavior and do not need to be executed as part of the test suite.

import { buildCommand, buildRouteMap, numberParser, type CommandContext, type TypedFlagParameter } from "../src";

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}

{
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
}
