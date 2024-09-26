import { buildCommand, numberParser } from "npm:@stricli/core";

type Flags = {
    readonly count?: number;
};

export const command = buildCommand({
    func: (flags: Flags, text: string) => {
        const count = flags.count ?? 1;
        for (let i = 0; i < count; ++i) {
            console.log(text);
        }
    },
    parameters: {
        flags: {
            count: {
                brief: "Number of times to repeat the argument",
                kind: "parsed",
                parse: numberParser,
                optional: true,
            },
        },
        positional: {
            kind: "tuple",
            parameters: [
                {
                    brief: "Text to repeat",
                    parse: String,
                    placeholder: "text",
                },
            ],
        },
    },
    docs: {
        brief: "Echo the first argument to the console",
    },
});
