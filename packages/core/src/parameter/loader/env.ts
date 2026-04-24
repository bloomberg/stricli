// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.
import type { CommandContext } from "../../context";
import type { DefaultValueLoader, InputParser } from "../types";

export function buildEnvironmentVariableDefaultValue(name: string): DefaultValueLoader<string>;
export function buildEnvironmentVariableDefaultValue<T>(name: string, parser: InputParser<T>): DefaultValueLoader<T>;
export function buildEnvironmentVariableDefaultValue<T>(name: string, parser?: InputParser<T>): DefaultValueLoader<T> {
    return {
        brief: `env:$${name}`,
        async load(this: CommandContext) {
            const value = this.process.env?.[name] ?? "";
            if (typeof value === "string" && parser) {
                return parser.call(this, value);
            }
            return value as T;
        },
    };
}
