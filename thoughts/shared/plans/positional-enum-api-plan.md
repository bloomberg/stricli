# Positional Enum API Design Plan
Created: 2025-01-22
Author: architect-agent

## Overview

Design and document the API shape for positional enum parameters in stricli. Positional enums should maintain consistency with the existing flag enum API while respecting the unique constraints of positional arguments.

## Requirements

- [ ] Design an enum positional API consistent with flag enums
- [ ] Support required and optional enum positionals
- [ ] Support enum arrays (variadic equivalent for positionals)
- [ ] Ensure backward compatibility with existing positional parameters
- [ ] Enable shell completion integration
- [ ] Generate appropriate help text

## Current State Analysis

### Flag Enum API (Reference)

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

Key characteristics:
- `kind: "enum"` discriminator
- `values` array for valid choices
- `variadic` for multiple values (boolean or separator string)
- `default` can be single value or array
- `optional` for runtime optionality
- `hidden` for hiding from help

### Current Positional API

```typescript
// Location: packages/core/src/parameter/positional/types.ts:6-45
interface BasePositionalParameter<T, CONTEXT extends CommandContext> extends ParsedParameter<T, CONTEXT> {
    readonly brief: string;
    readonly placeholder?: string;
    readonly default?: string;
    readonly optional?: boolean;
}
```

Positionals have:
- No `kind` discriminator (all use `parse` function)
- No `hidden` property
- Variadic via `kind: "array"` wrapper, not a `variadic` property
- Tuple and array container types

## Design Decision: API Shape for Positional Enums

### Question 1: Should we use `kind: "enum"` like flags?

**Decision: YES** - Use `kind: "enum"` discriminator

**Rationale:**
1. Consistency with flag enum API
2. Enables proper type narrowing
3. Allows enum-specific handling without requiring a `parse` function
4. Clear distinction from parsed parameters

### Question 2: Should it be `values` array or something else?

**Decision: `values`** - Keep the same property name as flags

**Rationale:**
1. Consistency with flag API
2. Clear and descriptive name
3. Parallel structure simplifies understanding

### Question 3: Optional vs Required enum positionals?

**Decision: Use `optional: boolean` like existing positionals**

**Rationale:**
1. Matches existing positional parameter pattern
2. Required enum (no `optional` or `optional: false`)
3. Optional enum (`optional: true`)

### Question 4: Variadic enum positionals?

**Decision: Use the existing array wrapper pattern, NOT a `variadic` property**

**Rationale:**
1. Positionals already use `kind: "array"` for variadic behavior
2. Adding `variadic` would introduce inconsistency
3. The array wrapper supports `minimum` and `maximum` constraints
4. No separator-based splitting needed (unlike flags which use `variadic: ","`)

### Question 5: What about defaults?

**Decision:**
- Single enum: `default?: T` (must be one of the values)
- Array enums: No default on the parameter, use array wrapper defaults if needed

**Rationale:**
1. Single value defaults align with flag behavior
2. Array defaults are handled at the container level (`minimum`, `maximum`)
3. Simpler type structure

## Proposed API Design

### Base Interface

```typescript
// packages/core/src/parameter/positional/types.ts
export interface BaseEnumPositionalParameter<T extends string> {
    /**
     * Discriminator indicating this is an enum positional parameter.
     */
    readonly kind: "enum";
    /**
     * Array of all possible values for this enum.
     */
    readonly values: readonly T[];
    /**
     * Default value if one is not provided at runtime.
     * Must be one of the values in the values array.
     */
    readonly default?: T;
    /**
     * In-line documentation for this parameter.
     */
    readonly brief: string;
    /**
     * String placeholder for usage text.
     */
    readonly placeholder?: string;
}
```

### Required vs Optional Variants

```typescript
interface RequiredEnumPositionalParameter<T extends string> extends BaseEnumPositionalParameter<T> {
    readonly optional?: false;
}

interface OptionalEnumPositionalParameter<T extends string> extends BaseEnumPositionalParameter<T> {
    readonly optional: true;
    // Optional positionals should not have defaults
    readonly default?: undefined;
}

export type EnumPositionalParameter<T extends string> = 
    | RequiredEnumPositionalParameter<T>
    | OptionalEnumPositionalParameter<T>;
```

### Integration with Existing Types

```typescript
// Update PositionalParameter union
export type PositionalParameter = 
    | BasePositionalParameter<unknown, CommandContext>
    | BaseEnumPositionalParameter<string>;

// Update TypedPositionalParameter
export type TypedPositionalParameter<T, CONTEXT extends CommandContext> = 
    [T] extends [string]
        ? EnumPositionalParameter<T>  // String literals become enum candidates
        : undefined extends T
            ? OptionalPositionalParameter<NonNullable<T>, CONTEXT>
            : RequiredPositionalParameter<T, CONTEXT>;
```

## Breaking Changes Analysis

### Potential Breaking Changes

1. **Type Union Expansion**: Adding `BaseEnumPositionalParameter` to `PositionalParameter` union
   - **Risk**: LOW - Adding to a union is non-breaking for existing code
   - **Mitigation**: Existing positional definitions continue to work

2. **TypedPositionalParameter Type Inference**: Changes to type conditional logic
   - **Risk**: MEDIUM - If someone relies on exact type structure
   - **Mitigation**: Careful type testing to ensure fallback to `BasePositionalParameter`

3. **Scanner Behavior**: Adding enum validation path
   - **Risk**: LOW - Only affects new enum parameters
   - **Mitigation**: Kind discrimination ensures existing parameters use parse function

### Non-Breaking Approach

The safest approach is to make enum positionals opt-in via explicit `kind: "enum"`. Users must explicitly specify the kind, so existing code is unaffected.

## Data Flow

```
User Input: "myapp info"
                  |
                  v
        +---------------------+
        |  Argument Scanner   |
        +---------------------+
                  |
        1. Check parameter.kind === "enum"
        2. Validate: parameter.values.includes(input)
        3. If invalid: throw EnumValidationError(placeholder, input, values, suggestions)
                  |
                  v
        +---------------------+
        |   Help Formatting   |
        +---------------------+
                  |
        Display: parameter.values.join("|")
        Output: "arg1 [info|warn|error]  Logging level"
                  |
                  v
        +---------------------+
        |   Completions       |
        +---------------------+
                  |
        Return: parameter.values.filter(v => v.startsWith(partial))
```

## Implementation Phases

### Phase 1: Type Definitions

**Files to create/modify:**
- `packages/core/src/parameter/positional/types.ts` - Add enum types

**Acceptance:**
- [ ] `BaseEnumPositionalParameter<T>` defined
- [ ] `RequiredEnumPositionalParameter<T>` defined
- [ ] `OptionalEnumPositionalParameter<T>` defined
- [ ] `PositionalParameter` union includes enum type
- [ ] `TypedPositionalParameter` supports enum inference

**Estimated effort:** Small

### Phase 2: Validation Logic

**Files to modify:**
- `packages/core/src/parameter/scanner.ts` - Add enum validation in positional parsing

**Acceptance:**
- [ ] Enum values validated during parsing
- [ ] `EnumValidationError` thrown for invalid values
- [ ] Fuzzy suggestions provided for typos
- [ ] Default values validated if provided

**Estimated effort:** Medium

### Phase 3: Help Text Formatting

**Files to modify:**
- `packages/core/src/parameter/positional/formatting.ts` - Add enum values display

**Acceptance:**
- [ ] Enum values shown as pipe-separated list
- [ ] Optional enum shown with brackets
- [ ] Default values displayed if set
- [ ] Help text matches flag enum style

**Estimated effort:** Small

### Phase 4: Completions

**Files to modify:**
- `packages/core/src/parameter/scanner.ts` - Update proposeCompletions for positionals

**Acceptance:**
- [ ] Enum values used for completions
- [ ] Partial input filtering works
- [ ] Array enum positionals supported

**Estimated effort:** Small

### Phase 5: Testing

**Files to create:**
- `packages/core/tests/parameter/positional/enum.spec.ts` - Enum positional tests
- Update `packages/core/tests/parameter/scanner.spec.ts` - Integration tests

**Coverage target:** 90%

**Test cases:**
- [ ] Required enum validation
- [ ] Optional enum with no input
- [ ] Invalid enum input throws error
- [ ] Fuzzy suggestions on typo
- [ ] Array enum validation
- [ ] Help text formatting
- [ ] Completions generation
- [ ] Default value validation

**Estimated effort:** Medium

### Phase 6: Documentation

**Files to create:**
- `docs/features/positional-enums.md` - User documentation
- Update README if needed

**Acceptance:**
- [ ] API documented
- [ ] Examples provided
- [ ] Migration guide (if applicable)

**Estimated effort:** Small

## API Consistency Summary

| Aspect | Flag Enum | Positional Enum | Consistent? |
|--------|-----------|-----------------|-------------|
| Discriminator | `kind: "enum"` | `kind: "enum"` | YES |
| Values array | `values: readonly T[]` | `values: readonly T[]` | YES |
| Optional marker | `optional: boolean` | `optional: boolean` | YES |
| Default support | `default?: T \| T[]` | `default?: T` | MOSTLY (no array default) |
| Variadic support | `variadic: boolean \| string` | Array wrapper | DIFFERENT (by design) |
| Hidden support | `hidden?: boolean` | N/A | N/A (positionals can't be hidden) |

## Examples

### Required Single Enum

```typescript
type LogLevel = "info" | "warn" | "error";

const command = buildCommand({
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    kind: "enum",
                    values: ["info", "warn", "error"] as const,
                    brief: "Log level to display",
                }
            ]
        }
    },
    func: (_flags, level: LogLevel) => {
        console.log(`Level: ${level}`);
    }
});

// Usage: myapp info
// Error: myapp invalid -> Expected "invalid" to be one of (info|warn|error)
```

### Optional Single Enum

```typescript
const command = buildCommand({
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    kind: "enum",
                    values: ["info", "warn", "error"] as const,
                    optional: true,
                    brief: "Log level (optional)",
                }
            ]
        }
    },
    func: (_flags, level: LogLevel | undefined) => {
        console.log(`Level: ${level ?? "default"}`);
    }
});

// Usage: myapp info -> Level: info
// Usage: myapp -> Level: default
```

### Enum with Default

```typescript
const command = buildCommand({
    parameters: {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    kind: "enum",
                    values: ["info", "warn", "error"] as const,
                    default: "info",
                    brief: "Log level",
                }
            ]
        }
    },
    func: (_flags, level: LogLevel) => {
        console.log(`Level: ${level}`);
    }
});

// Usage: myapp -> Level: info
// Usage: myapp warn -> Level: warn
```

### Enum Array (Variadic Equivalent)

```typescript
const command = buildCommand({
    parameters: {
        positional: {
            kind: "array",
            parameter: {
                kind: "enum",
                values: ["json", "xml", "yaml"] as const,
                brief: "Output formats",
            },
            minimum: 1,
        }
    },
    func: (_flags, formats: ("json" | "xml" | "yaml")[]) => {
        console.log(`Formats: ${formats.join(", ")}`);
    }
});

// Usage: myapp json xml -> Formats: json, xml
// Error: myapp invalid -> Expected "invalid" to be one of (json|xml|yaml)
```

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Type inference conflicts | Medium | Thorough type testing with various literal types |
| Breaking changes to `TypedPositionalParameter` | High | Careful conditional type design; fallback to existing behavior |
| Inconsistent behavior with flags | Medium | Document differences (variadic handling) |
| Completion integration issues | Low | Reuse existing completion infrastructure |

## Open Questions

- [ ] Should enum positionals support custom `proposeCompletions` alongside the enum values?
  - **Recommendation**: No, enum values should be the only source for completions to keep it simple

- [ ] Should we support `default` as an array for enum arrays?
  - **Recommendation**: No, use the `minimum: 0` pattern for optional arrays

- [ ] How to handle empty `values` array?
  - **Recommendation**: Throw at build time if `values.length === 0`

## Success Criteria

1. [ ] API is consistent with flag enums where applicable
2. [ ] Existing positional parameters continue to work unchanged
3. [ ] Type inference works for string literal types
4. [ ] Validation errors provide helpful messages
5. [ ] Help text displays enum values correctly
6. [ ] Shell completions work for enum positionals
7. [ ] Test coverage exceeds 90%
