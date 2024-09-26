import { buildCommand, numberParser, type Command, type CommandContext } from "npm:@stricli/core";

type MathFunction = keyof {
    [F in keyof Math as Math[F] extends (...values: number[]) => number ? F : never]: F;
};

type MathFunctionArity = {
    [F in MathFunction as Parameters<Math[F]>["length"]]: F;
};

export function buildUnaryMathCommand(op: MathFunctionArity[1]): Command<CommandContext> {
    return buildCommand({
        func: (flags: {}, input: number) => {
            console.log(Math[op](input));
        },
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        brief: "Input number",
                        parse: numberParser,
                    },
                ],
            },
        },
        docs: {
            brief: `Run ${op} on input`,
        },
    });
}

export function buildBinaryMathCommand(op: MathFunctionArity[2]): Command<CommandContext> {
    return buildCommand({
        func: (flags: {}, input1: number, input2: number) => {
            console.log(Math[op](input1, input2));
        },
        parameters: {
            positional: {
                kind: "tuple",
                parameters: [
                    {
                        brief: "First input number",
                        parse: numberParser,
                    },
                    {
                        brief: "Second input number",
                        parse: numberParser,
                    },
                ],
            },
        },
        docs: {
            brief: `Run ${op} on inputs`,
        },
    });
}

export function buildVariadicMathCommand(op: MathFunctionArity[number]): Command<CommandContext> {
    return buildCommand({
        func: (flags: {}, ...inputs: number[]) => {
            console.log(Math[op](...inputs));
        },
        parameters: {
            positional: {
                kind: "array",
                parameter: {
                    brief: "List of input numbers",
                    parse: numberParser,
                },
            },
        },
        docs: {
            brief: `Run ${op} on inputs`,
        },
    });
}
