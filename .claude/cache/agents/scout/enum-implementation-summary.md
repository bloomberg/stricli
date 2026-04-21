# Flag Enum Implementation Pattern - Quick Reference

## Architecture Diagram

```
User Input
    ↓
Scanner (scanner.ts)
    ↓
    ├─→ Parse Input
    │   ├─→ Check if flag.kind === "enum"
    │   ├─→ Validate: flag.values.includes(input)
    │   └─→ Throw EnumValidationError if invalid (with fuzzy suggestions)
    │
    ├─→ Generate Help Text
    │   └─→ Format: flag.values.join("|") → "info|warn|error"
    │
    └─→ Generate Completions
        └─→ Return flag.values filtered by partial input
```

## Code Locations

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| **Type Definition** | `packages/core/src/parameter/flag/types.ts` | 117-215 | Interface + type variants |
| **Error Class** | `packages/core/src/parameter/scanner.ts` | 206-245 | EnumValidationError |
| **Validation Logic** | `packages/core/src/parameter/scanner.ts` | 594-599, 575-582 | Value checking |
| **Default Validation** | `packages/core/src/parameter/scanner.ts` | 532-545 | Check default values |
| **Help Formatting** | `packages/core/src/parameter/flag/formatting.ts` | 56-59 | Display values |
| **Completions** | `packages/core/src/parameter/scanner.ts` | 1064-1065 | Enum value lookup |
| **Tests** | `packages/core/tests/parameter/scanner.spec.ts` | 5414-5530 | Test examples |

## Key Code Snippets

### 1. Type Definition
```typescript
interface BaseEnumFlagParameter<T extends string> {
    readonly kind: "enum";
    readonly values: readonly T[];
    readonly default?: T | readonly T[];
    readonly optional?: boolean;
    readonly brief: string;
}
```

### 2. Validation (Single Value)
```typescript
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
        throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
    }
    return input;
}
```

### 3. Help Text
```typescript
if (flag.kind === "enum") {
    const choices = flag.values.join("|");
    suffixParts.push(choices);
}
// Output: --level [info|warn|error]
```

### 4. Completions
```typescript
if (flag.kind === "enum") {
    values = flag.values;  // Direct use - no custom parser needed
}
```

## Type Variants

| Variant | Properties | Use Case |
|---------|------------|----------|
| `RequiredEnumFlagParameter` | No `optional: true` | Must provide value |
| `OptionalEnumFlagParameter` | `optional: true` | Can omit |
| `RequiredVariadicEnumFlagParameter` | `variadic: true \| string` | Array of values, required |
| `OptionalVariadicEnumFlagParameter` | `optional: true`, `variadic: true \| string` | Array of values, optional |

## Error Message Format

```
Expected "invlid" to be one of (info|warn|error), did you mean "info"?
```

Components:
- Input value
- Pipe-separated allowed values
- Fuzzy suggestion (if close match found)

## For Positional Arguments

### Needed Changes

1. **Add type** in `positional/types.ts`:
   ```typescript
   interface BaseEnumPositionalParameter<T extends string> {
       readonly kind: "enum";
       readonly values: readonly T[];
       // ... rest of properties
   }
   ```

2. **Add validation** in `scanner.ts` (positional parsing section):
   ```typescript
   if (parameter.kind === "enum") {
       if (!parameter.values.includes(input)) {
           throw new EnumValidationError(placeholder, input, parameter.values, corrections);
       }
       return input;
   }
   ```

3. **Add help formatting** in `positional/formatting.ts`:
   ```typescript
   if (def.kind === "enum") {
       const choices = def.values.join("|");
       suffixParts.push(choices);
   }
   ```

4. **Add completions** in `scanner.ts` (already supports `proposeCompletions` for positionals):
   ```typescript
   // Enum positionals will use values directly
   if (nextPositional.kind === "enum") {
       values = nextPositional.values;
   }
   ```

## Validation Strategy

**Flags:** Validate during `parseInputsForFlag()` function
**Positionals:** Validate during `parseArguments()` -> positional array mapping

**Helper:** `filterClosestAlternatives()` provides fuzzy matching for typos

## Completions Strategy

**Flags:** Special handling in `proposeFlagCompletionsForPartialInput()`
**Positionals:** Already calls `proposeCompletions` on parameter (line 1036)

**Insight:** Enum positionals can use the same pattern - just return `parameter.values` instead of calling a custom function.

## Testing Pattern

```typescript
describe("positional enum", () => {
    const parameters = {
        positional: {
            kind: "tuple",
            parameters: [
                {
                    kind: "enum",
                    values: ["foo", "bar", "baz"],
                    brief: "mode"
                }
            ]
        }
    };

    it("validates input", async () => {
        // Test valid inputs
        await testParse({ inputs: ["foo"], expected: { success: true } });
        
        // Test invalid input with error
        await testParse({ 
            inputs: ["invalid"], 
            expected: { 
                success: false,
                errors: [{ type: "EnumValidationError" }]
            } 
        });
    });
});
```

## Key Differences: Flags vs Positionals

| Aspect | Flags | Positionals |
|--------|-------|-------------|
| **Type location** | `flag/types.ts` | `positional/types.ts` |
| **Validation** | `parseInputsForFlag()` | Array mapping in `parseArguments()` |
| **Help formatting** | `flag/formatting.ts` | `positional/formatting.ts` |
| **Completions** | Special function | Already supports `proposeCompletions` |
| **Variadic support** | Yes (`variadic: true \| ","`) | Yes (array mode) |
| **Error context** | External flag name | Placeholder (arg1, arg2, etc.) |

## Implementation Checklist

- [ ] Add `BaseEnumPositionalParameter<T>` interface
- [ ] Add type variants (required/optional/variadic)
- [ ] Update `TypedPositionalParameter` to handle enums
- [ ] Add validation in scanner (positional parsing)
- [ ] Add help text formatting
- [ ] Add completion support
- [ ] Add tests for validation
- [ ] Add tests for error messages
- [ ] Add tests for completions
- [ ] Update documentation

## Example: Complete Positional Enum Usage

```typescript
// Type definition
type Args = [mode: "info" | "warn" | "error"];

// Command definition
buildCommand({
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

// Usage
$ myapp info
$ myapp warn
$ myapp invalid
// Error: Expected "invalid" to be one of (info|warn|error), did you mean "info"?
```
