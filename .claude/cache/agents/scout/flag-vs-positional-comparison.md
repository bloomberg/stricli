# Flag Enum vs Positional Enum - Side-by-Side Comparison

## Type Definitions

### Flag Enum (CURRENT)
```typescript
// Location: packages/core/src/parameter/flag/types.ts:117-134
export interface BaseEnumFlagParameter<T extends string> extends BaseFlagParameter {
    readonly kind: "enum";
    readonly values: readonly T[];
    readonly default?: T | readonly T[];
    readonly optional?: boolean;
    readonly hidden?: boolean;
    readonly variadic?: boolean | string;
    readonly brief: string;
    readonly placeholder?: string;
}
```

### Positional Enum (TO BE IMPLEMENTED)
```typescript
// Location: packages/core/src/parameter/positional/types.ts (NEW)
export interface BaseEnumPositionalParameter<T extends string> {
    readonly kind: "enum";
    readonly values: readonly T[];
    readonly default?: T;
    readonly optional?: boolean;
    readonly brief: string;
    readonly placeholder?: string;
    // Note: No 'hidden' property for positionals
    // Note: No 'variadic' - use array kind instead
}
```

## Validation Implementation

### Flag Enum Validation (CURRENT)
```typescript
// Location: packages/core/src/parameter/scanner.ts:594-599
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
        throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
    }
    return input;
}
```

### Positional Enum Validation (TO BE IMPLEMENTED)
```typescript
// Location: packages/core/src/parameter/scanner.ts (NEW - in positional parsing section)
if (param.kind === "enum") {
    if (!param.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, param.values, config.distanceOptions);
        throw new EnumValidationError(placeholder, input, param.values, corrections);
    }
    return input;
}
```

## Help Text Display

### Flag Enum Help (CURRENT)
```typescript
// Location: packages/core/src/parameter/flag/formatting.ts:56-59
if (flag.kind === "enum") {
    const choices = flag.values.join("|");
    suffixParts.push(choices);
}
// Output: --level [info|warn|error]
```

### Positional Enum Help (TO BE IMPLEMENTED)
```typescript
// Location: packages/core/src/parameter/positional/formatting.ts (NEW)
if (def.kind === "enum") {
    const choices = def.values.join("|");
    suffixParts.push(choices);
}
// Output: level [info|warn|error]  Logging level
```

## Shell Completions

### Flag Enum Completions (CURRENT)
```typescript
// Location: packages/core/src/parameter/scanner.ts:1064-1065
if (flag.kind === "enum") {
    values = flag.values;  // Use enum values directly
}
```

### Positional Enum Completions (TO BE IMPLEMENTED)
```typescript
// Location: packages/core/src/parameter/scanner.ts:1036 (MODIFY EXISTING)
// Current code:
if (nextPositional?.proposeCompletions) {
    const positionalCompletions = await nextPositional.proposeCompletions.call(context, partial);
    // ...
}

// New code:
if (nextPositional?.kind === "enum") {
    values = nextPositional.values;  // Use enum values directly
} else if (nextPositional?.proposeCompletions) {
    values = await nextPositional.proposeCompletions.call(context, partial);
}
```

## Error Handling

### Both Use the Same Error Class
```typescript
// Location: packages/core/src/parameter/scanner.ts:209-245
export class EnumValidationError extends ArgumentScannerError {
    readonly externalFlagName: string;  // For flags: "--level"
    readonly input: string;             // Invalid input
    readonly values: readonly string[]; // Allowed values
    // ...
}

// For positionals, use placeholder instead of externalFlagName:
throw new EnumValidationError(placeholder, input, values, corrections);
// Output: Expected "invalid" to be one of (info|warn|error)
```

## Complete Example Comparison

### Flag Enum Example (WORKING)
```typescript
type Flags = {
    level: "info" | "warn" | "error";
};

const command = buildCommand({
    parameters: {
        flags: {
            level: {
                kind: "enum",
                values: ["info", "warn", "error"],
                brief: "Logging level"
            }
        }
    }
});

// Usage:
$ myapp --level info
$ myapp --level invalid
// Error: Expected "invalid" to be one of (info|warn|error), did you mean "info"?
```

### Positional Enum Example (TO BE IMPLEMENTED)
```typescript
type Args = [level: "info" | "warn" | "error"];

const command = buildCommand({
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    kind: "enum",
                    values: ["info", "warn", "error"],
                    brief: "Logging level"
                }
            ]
        }
    }
});

// Usage:
$ myapp info
$ myapp invalid
// Error: Expected "invalid" to be one of (info|warn|error), did you mean "info"?
```

## Variadic Support

### Flag Enum Variadic (CURRENT)
```typescript
type Flags = {
    tags: "tag1" | "tag2" | "tag3"[];
};

const command = buildCommand({
    parameters: {
        flags: {
            tags: {
                kind: "enum",
                values: ["tag1", "tag2", "tag3"],
                variadic: true,  // Array of enum values
                brief: "Tags"
            }
        }
    }
});

// Usage:
$ myapp --tags tag1 --tags tag2
$ myapp --tags tag1,tag2,tag3  // With variadic: ","
```

### Positional Enum Array (TO BE IMPLEMENTED)
```typescript
type Args = [...tags: ("tag1" | "tag2" | "tag3")[]];

const command = buildCommand({
    parameters: {
        positional: {
            kind: "array",
            parameter: {
                kind: "enum",
                values: ["tag1", "tag2", "tag3"],
                brief: "Tags"
            },
            minimum: 1,
            maximum: 3
        }
    }
});

// Usage:
$ myapp tag1 tag2 tag3
$ myapp invalid
// Error: Expected "invalid" to be one of (tag1|tag2|tag3)
```

## Implementation Checklist

### Files to Modify

1. **packages/core/src/parameter/positional/types.ts**
   - [ ] Add `BaseEnumPositionalParameter<T>` interface
   - [ ] Add type variants
   - [ ] Update union types to include enum

2. **packages/core/src/parameter/scanner.ts**
   - [ ] Add enum validation in positional parsing section
   - [ ] Update completions to check for enum kind

3. **packages/core/src/parameter/positional/formatting.ts**
   - [ ] Add enum values display in help text

4. **packages/core/tests/parameter/scanner.spec.ts**
   - [ ] Add positional enum validation tests
   - [ ] Add error message tests
   - [ ] Add completion tests

### Type System Updates

```typescript
// Update union type in positional/types.ts
export type PositionalParameter = 
    | BasePositionalParameter<unknown, CommandContext>
    | BaseEnumPositionalParameter<string>;  // NEW

// Update typed parameter
export type TypedPositionalParameter<T, CONTEXT> = 
    T extends string 
        ? BaseEnumPositionalParameter<T, CONTEXT>  // NEW - enum takes precedence
        : undefined extends T
            ? OptionalPositionalParameter<NonNullable<T>, CONTEXT>
            : RequiredPositionalParameter<T, CONTEXT>;
```

## Key Insights

1. **Reuse Existing Error Class**: `EnumValidationError` works for both flags and positionals
2. **Same Validation Pattern**: `values.includes(input)` + fuzzy matching
3. **Help Text Pattern**: `values.join("|")` for display
4. **Completions Pattern**: Use values directly, no custom parser needed
5. **Positional Simpler**: No `hidden` property, no `variadic` flag (use array kind)
6. **Type Discrimination**: Use `kind: "enum"` for type narrowing

## Testing Strategy

Copy flag enum test patterns to positional tests:

```typescript
// From packages/core/tests/parameter/scanner.spec.ts:5414-5530
describe("positional enum parameter", () => {
    it("validates against allowed values");
    it("throws EnumValidationError for invalid input");
    it("provides suggestions for typos");
    it("validates default values");
    it("provides completions from enum values");
    it("displays values in help text");
});
```
