# Debug Report: Stricli Enum Implementation Deep Dive
Generated: 2025-01-22

## Investigation Questions

1. How exactly does the flag enum `kind` discriminator work in the type system?
2. How does `buildChoiceParser` work internally?
3. What is the `EnumValidationError` class and where is it thrown?
4. How are completions generated for enum flags?
5. Are there any other parameter types that use similar patterns?
6. What's the difference between `ParsedParameter` and enum-specific handling?

---

## 1. How the Flag Enum `kind` Discriminator Works

### Type Definition Location
**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/flag/types.ts`

### The Discriminator Pattern

The `kind` property is a literal type that serves as a discriminant in a discriminated union:

```typescript
// Lines 117-134
export interface BaseEnumFlagParameter<T extends string> extends BaseFlagParameter {
    readonly kind: "enum";  // <- Discriminator
    readonly values: readonly T[];
    readonly default?: T | readonly T[];
    readonly optional?: boolean;
    readonly hidden?: boolean;
    readonly variadic?: boolean | string;
}
```

### Type-Level Flow

The `TypedFlagParameter` type uses conditional types to route the parameter definition based on the type `T`:

```typescript
// Lines 332-364
type TypedFlagParameter_Optional<T, CONTEXT extends CommandContext> = [T] extends [readonly (infer A)[]]
    ? [A] extends [string]
        ? 
              | OptionalVariadicParsedFlagParameter<A, CONTEXT>
              | OptionalParsedFlagParameter<T, CONTEXT>
              | OptionalVariadicEnumFlagParameter<A>  // <- Array of strings can use enum
        : OptionalVariadicParsedFlagParameter<A, CONTEXT> | OptionalParsedFlagParameter<T, CONTEXT>
    : [T] extends [boolean]
      ? OptionalBooleanFlagParameter | OptionalParsedFlagParameter<boolean, CONTEXT>
      : [T] extends [number]
        ? OptionalCounterFlagParameter | RequiredParsedFlagParameter<number, CONTEXT>
        : string extends T
          ? OptionalParsedFlagParameter<string, CONTEXT>
          : [T] extends [string]
            ? OptionalEnumFlagParameter<T> | OptionalParsedFlagParameter<T, CONTEXT>  // <- String literal types can use enum
            : OptionalParsedFlagParameter<T, CONTEXT>;
```

### Runtime Discrimination

The scanner checks the `kind` property at runtime:

```typescript
// scanner.ts lines 594-599
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
        throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
    }
    return input;
}
```

### Key Insight

The `kind` property serves two purposes:
1. **Type-level**: TypeScript narrows the union type based on the literal value
2. **Runtime**: The code switches behavior based on the discriminated value

Unlike `ParsedParameter` which requires a `parse` function, enum flags use the built-in `values` array for validation, avoiding the need for a custom parser.

---

## 2. How `buildChoiceParser` Works

### Location
**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/parser/choice.ts`

### Implementation

```typescript
// Full file (only 20 lines)
function narrowString<T extends string>(choices: readonly T[], value: string): value is T {
    return choices.includes(value as T);
}

export function buildChoiceParser<T extends string>(choices: readonly T[]): InputParser<T> {
    return (input: string): T => {
        if (!narrowString(choices, input)) {
            throw new SyntaxError(`${input} is not one of (${choices.join("|")})`);
        }
        return input;
    };
}
```

### Key Characteristics

1. **Type narrowing**: Uses a type predicate `value is T` to narrow the input type
2. **Validation**: Throws `SyntaxError` (not `EnumValidationError`) for invalid inputs
3. **No completions**: Unlike enum flags, `buildChoiceParser` does NOT provide completions

### Usage Pattern

Used primarily for **positional parameters** (not flags):

```typescript
// From scanner.spec.ts lines 276-295
type Positional = ["add" | "remove", number];

const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
    positional: {
        kind: "tuple",
        parameters: [
            {
                placeholder: "action",
                brief: "action",
                parse: buildChoiceParser(["add", "remove"]),  // <- Uses parse function
            },
            {
                brief: "number",
                parse: numberParser,
            },
        ],
    },
};
```

### Difference from Flag Enums

| Aspect | `buildChoiceParser` | Flag `kind: "enum"` |
|--------|---------------------|---------------------|
| Type | Parser function | Parameter definition |
| Error type | `SyntaxError` | `EnumValidationError` |
| Completions | Must add `proposeCompletions` manually | Built-in |
| Usage | Positional parameters | Flags only |

---

## 3. The `EnumValidationError` Class

### Location
**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/scanner.ts` (lines 207-245)

### Definition

```typescript
export class EnumValidationError extends ArgumentScannerError {
    readonly externalFlagName: string;
    readonly input: string;
    readonly values: readonly string[];
    constructor(
        externalFlagName: ExternalFlagName,
        input: string,
        values: readonly string[],
        corrections: readonly string[],
    ) {
        let message = `Expected "${input}" to be one of (${values.join("|")})`;
        if (corrections.length > 0) {
            const formattedCorrections = joinWithGrammar(
                corrections.map((str) => `"${str}"`),
                {
                    kind: "conjunctive",
                    conjunction: "or",
                    serialComma: true,
                },
            );
            message += `, did you mean ${formattedCorrections}?`;
        }
        super(message);
        this.externalFlagName = externalFlagName;
        this.input = input;
        this.values = values;
    }
}
```

### Where It's Thrown

The `EnumValidationError` is thrown in **three places** in `parseInputsForFlag`:

1. **Default value validation** (lines 532-543):
```typescript
if (flag.kind === "enum") {
    if ("variadic" in flag && flag.variadic && Array.isArray(flag.default)) {
        const defaultArray = flag.default as readonly string[];
        for (const value of defaultArray) {
            if (!flag.values.includes(value)) {
                const corrections = filterClosestAlternatives(value, flag.values, config.distanceOptions);
                throw new EnumValidationError(externalFlagName, value, flag.values, corrections);
            }
        }
        return flag.default;
    }
    return flag.default;
}
```

2. **Variadic enum validation** (lines 575-582):
```typescript
if (flag.kind === "enum") {
    for (const input of inputs) {
        if (!flag.values.includes(input)) {
            const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
            throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
        }
    }
    return inputs;
}
```

3. **Single value enum validation** (lines 594-599):
```typescript
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
        throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
    }
    return input;
}
```

### Error Format

The error includes:
- The invalid input value
- All valid enum values
- Spelling suggestions (via `filterClosestAlternatives`)

Example error message:
```
Expected "INVALID" to be one of (foo|bar|baz), did you mean "bar"?
```

---

## 4. How Completions Are Generated for Enum Flags

### Location
**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/scanner.ts`

### Completion Function: `proposeFlagCompletionsForPartialInput`

```typescript
// Lines 1053-1080
async function proposeFlagCompletionsForPartialInput<CONTEXT extends CommandContext>(
    flag: FlagParserExpectingInput<CONTEXT>,
    context: CONTEXT,
    partial: string,
) {
    if (typeof flag.variadic === "string") {
        if (partial.endsWith(flag.variadic)) {
            return proposeFlagCompletionsForPartialInput(flag, context, "");
        }
    }
    let values: readonly string[];
    if (flag.kind === "enum") {
        values = flag.values;  // <- Direct use of enum values
    } else if (flag.proposeCompletions) {
        values = await flag.proposeCompletions.call(context, partial);
    } else {
        values = [];
    }
    return values
        .map<ArgumentCompletion>((value) => {
            return {
                kind: "argument:value",
                completion: value,
                brief: flag.brief,
            };
        })
        .filter(({ completion }) => completion.startsWith(partial));
}
```

### Key Behaviors

1. **Built-in values**: For `kind: "enum"`, completions come directly from `flag.values`
2. **Separator handling**: For variadic enums with a separator (e.g., `variadic: ","`), if the partial ends with the separator, completions restart from empty
3. **Prefix filtering**: Only returns completions that start with the partial input

### Variadic Enum Example

From test cases (lines 6281-6306):
```typescript
type Flags = {
    readonly mode?: ("foo" | "bar" | "baz")[];
};

const parameters = {
    flags: {
        mode: {
            kind: "enum",
            values: ["foo", "bar", "baz"],
            optional: true,
            variadic: true,
        },
    },
};
```

With `--mode` as the active flag, completions would return:
```
[
    { kind: "argument:value", completion: "foo", brief: "mode" },
    { kind: "argument:value", completion: "bar", brief: "mode" },
    { kind: "argument:value", completion: "baz", brief: "mode" },
]
```

---

## 5. Other Parameter Types Using Similar Patterns

### Discriminated Parameter Types

All flag types use the `kind` discriminator:

| Kind | Interface | Purpose |
|------|-----------|---------|
| `"boolean"` | `BooleanFlagParameter` | True/false flags with optional negation |
| `"counter"` | `CounterFlagParameter` | Numeric counters (increment on each use) |
| `"enum"` | `BaseEnumFlagParameter<T>` | String literal unions |
| `"parsed"` | `BaseParsedFlagParameter<T>` | Custom parser with `parse` function |

### Type Definition Pattern

```typescript
// Lines 374-378
export type FlagParameter<CONTEXT extends CommandContext> =
    | BooleanFlagParameter
    | CounterFlagParameter
    | BaseEnumFlagParameter<string>
    | BaseParsedFlagParameter<unknown, CONTEXT>;
```

### Other Parameter-Kinds Using `values` Array

**Only enum flags** use the `values` array directly. The counter flag could conceptually use a similar pattern but doesn't:

```typescript
// Counter uses a numberParser internally
if (flag.kind === "counter") {
    return inputs.reduce((total, input) => {
        try {
            return total + numberParser.call(context, input);
        } catch (exc) {
            throw new ArgumentParseError(externalFlagName, input, exc);
        }
    }, 0);
}
```

---

## 6. `ParsedParameter` vs Enum-Specific Handling

### ParsedParameter Interface

**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/types.ts` (lines 15-24)

```typescript
export interface ParsedParameter<T, CONTEXT extends CommandContext> {
    readonly parse: InputParser<T, CONTEXT>;
    readonly proposeCompletions?: (this: CONTEXT, partial: string) => readonly string[] | Promise<readonly string[]>;
}
```

### Key Differences

| Aspect | `ParsedParameter` | `BaseEnumFlagParameter` |
|--------|-------------------|-------------------------|
| Parsing | Via `parse` function | Via `values.includes()` |
| Validation | In `parse` function | Built-in via `kind: "enum"` |
| Completions | Optional `proposeCompletions` | Automatic from `values` |
| Error type | Wrapped in `ArgumentParseError` | Direct `EnumValidationError` |
| Type inference | `T` from parser return | `T` from `values` array |

### Why Enums Don't Use `ParsedParameter`

Looking at the `TypedFlagParameter` conditional types, enum flags are a **separate branch** from parsed flags:

```typescript
// Line 345-346
: [T] extends [string]
    ? OptionalEnumFlagParameter<T> | OptionalParsedFlagParameter<T, CONTEXT>
```

This allows:
1. **Shorthand syntax**: `{ kind: "enum", values: [...] }` vs `{ kind: "parsed", parse: buildChoiceParser([...]) }`
2. **Better completions**: Automatic from `values` array
3. **Specific error messages**: `EnumValidationError` with suggestions vs generic `SyntaxError`

---

## 7. Positional Parameters and Enums

### Current State

Positional parameters **do not** have a built-in enum kind. To get enum-like behavior:

1. Use `buildChoiceParser` (no built-in completions)
2. Add `proposeCompletions` manually:

```typescript
const parameters: TypedCommandParameters<Flags, Positional, CommandContext> = {
    positional: {
        kind: "tuple",
        parameters: [
            {
                placeholder: "action",
                brief: "action",
                parse: buildChoiceParser(["add", "remove"]),
                proposeCompletions: async () => ["add", "remove"],  // <- Manual completions
            },
        ],
    },
};
```

### Completion for Positional Parameters

**File:** `/Users/nickita/storage/stricli/packages/core/src/parameter/scanner.ts` (lines 1033-1047)

```typescript
} else {
    const nextPositional = positional.parameters[positionalIndex];
    if (nextPositional?.proposeCompletions) {
        const positionalCompletions = await nextPositional.proposeCompletions.call(context, partial);
        completions.push(
            ...positionalCompletions.map<ArgumentCompletion>((value) => {
                return {
                    kind: "argument:value",
                    completion: value,
                    brief: nextPositional.brief,
                };
            }),
        );
    }
}
```

### Array Positional Parameters

```typescript
// Lines 1015-1032
if (positional.kind === "array") {
    if (positional.parameter.proposeCompletions) {
        if (typeof positional.maximum !== "number" || positionalIndex < positional.maximum) {
            const positionalCompletions = await positional.parameter.proposeCompletions.call(
                context,
                partial,
            );
            completions.push(
                ...positionalCompletions.map<ArgumentCompletion>((value) => {
                    return {
                        kind: "argument:value",
                        completion: value,
                        brief: positional.parameter.brief,
                    };
                }),
            );
        }
    }
}
```

---

## Root Cause Summary

### How Enum Flags Work

1. **Type-level**: `kind: "enum"` discriminates the union type at compile time
2. **Validation**: Direct `values.includes(input)` check in scanner
3. **Completions**: Automatic from `flag.values` array
4. **Error**: Specialized `EnumValidationError` with suggestions

### Why Positional Arguments Don't Have Enums

- Positional parameters use the `ParsedParameter` interface which requires a `parse` function
- The `kind` discriminator is **flag-specific**, not shared with positionals
- To add enum support to positionals, you'd need to:
  1. Add a `kind` property to `BasePositionalParameter`
  2. Create a `BaseEnumPositionalParameter<T>` interface
  3. Update `TypedPositionalParameter` conditional types
  4. Modify scanner to handle `kind === "enum"` for positionals
  5. Add completion support for enum positionals

### Key Files

| File | Purpose |
|------|---------|
| `/packages/core/src/parameter/flag/types.ts` | Enum flag type definitions |
| `/packages/core/src/parameter/positional/types.ts` | Positional parameter types (no enum) |
| `/packages/core/src/parameter/scanner.ts` | Runtime validation and completions |
| `/packages/core/src/parameter/parser/choice.ts` | `buildChoiceParser` for positionals |
| `/packages/core/src/parameter/formatting.ts` | Usage line formatting |

