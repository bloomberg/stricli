// Copyright 2024 Bloomberg Finance L.P.
// Distributed under the terms of the Apache 2.0 license.

/**
 * @internal
 */
export function convertKebabCaseToCamelCase(str: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return str.replace(/-./g, (match) => match[1]!.toUpperCase());
}

/**
 * @internal
 */
export function convertCamelCaseToKebabCase(name: string): string {
    return Array.from(name)
        .map((char, i) => {
            const upper = char.toUpperCase();
            const lower = char.toLowerCase();
            if (i === 0 || upper !== char || upper === lower) {
                return char;
            }
            return `-${lower}`;
        })
        .join("");
}
