# Flag Enum Implementation - Scout Report

## Report Contents

This directory contains a comprehensive analysis of the flag enum implementation in stricli, with patterns extracted for implementing enum support in positional arguments.

### Documents

1. **latest-output.md** - Complete implementation analysis with all code snippets
2. **enum-implementation-summary.md** - Quick reference guide
3. **flag-vs-positional-comparison.md** - Side-by-side comparison

## Quick Start

### What Was Found

The flag enum implementation includes:
- ✅ Type definitions with variants (required/optional/variadic)
- ✅ Runtime validation with fuzzy matching suggestions
- ✅ Help text display showing allowed values
- ✅ Shell completions using enum values
- ✅ Error messages with typo corrections
- ✅ Support for default values
- ✅ Full test coverage

### Key Pattern

```typescript
// 1. Type Definition
interface BaseEnumFlagParameter<T extends string> {
    readonly kind: "enum";
    readonly values: readonly T[];
    // ... other properties
}

// 2. Validation
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        throw new EnumValidationError(name, input, values, corrections);
    }
}

// 3. Help Text
const choices = flag.values.join("|");  // "info|warn|error"

// 4. Completions
values = flag.values;  // Use directly for tab completion
```

## Files to Modify for Positional Enums

| File | Lines | Change |
|------|-------|--------|
| `positional/types.ts` | N/A | Add `BaseEnumPositionalParameter<T>` |
| `scanner.ts` | ~820-856 | Add enum validation for positionals |
| `scanner.ts` | ~1036 | Add enum completions for positionals |
| `positional/formatting.ts` | ~10-43 | Add enum values to help text |
| `tests/parameter/scanner.spec.ts` | N/A | Add positional enum tests |

## Implementation Steps

1. **Add Type** - Define `BaseEnumPositionalParameter<T>` in `positional/types.ts`
2. **Validate** - Add enum checking in positional parsing loop in `scanner.ts`
3. **Format** - Display values in help text in `positional/formatting.ts`
4. **Complete** - Return enum values for shell completions in `scanner.ts`
5. **Test** - Add validation, error, and completion tests

## Code Locations

### Type System
- **Flag types**: `/packages/core/src/parameter/flag/types.ts:117-215`
- **Positional types**: `/packages/core/src/parameter/positional/types.ts:6-87`

### Validation
- **Error class**: `/packages/core/src/parameter/scanner.ts:209-245`
- **Flag validation**: `/packages/core/src/parameter/scanner.ts:594-599`
- **Flag variadic**: `/packages/core/src/parameter/scanner.ts:575-582`
- **Flag defaults**: `/packages/core/src/parameter/scanner.ts:532-545`

### Help Text
- **Flag formatting**: `/packages/core/src/parameter/flag/formatting.ts:56-59`
- **Positional formatting**: `/packages/core/src/parameter/positional/formatting.ts:10-43`

### Completions
- **Flag completions**: `/packages/core/src/parameter/scanner.ts:1064-1065`
- **Positional completions**: `/packages/core/src/parameter/scanner.ts:1036`

### Tests
- **Flag enum tests**: `/packages/core/tests/parameter/scanner.spec.ts:5414-5530`
- **Error tests**: `/packages/core/tests/parameter/scanner.spec.ts:10804-10830`

## Example Usage

### Flag Enum (Current)
```typescript
type Flags = {
    level: "info" | "warn" | "error";
};

buildCommand({
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
```

### Positional Enum (To Implement)
```typescript
type Args = [level: "info" | "warn" | "error"];

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
```

## Validation Flow

```
Input → Check kind === "enum" → Validate values.includes(input)
                                ↓
                              No → Throw EnumValidationError
                                ↓  (with fuzzy suggestions)
                              Yes → Return input
```

## Help Text Format

```
Flag:    --level [info|warn|error]  Logging level
Positional: level [info|warn|error]  Logging level
```

## Completion Behavior

```bash
$ myapp --level <TAB>
info    warn    error    # Flag enum

$ myapp <TAB>           # When first arg is enum
info    warn    error    # Positional enum (to implement)
```

## Error Messages

```bash
$ myapp --level invlaid
Error: Expected "invlaid" to be one of (info|warn|error), did you mean "info"?

$ myapp invlaid          # Positional enum (to implement)
Error: Expected "invlaid" to be one of (info|warn|error), did you mean "info"?
```

## Key Insights

1. **Reuse Everything**: Error class, validation logic, formatting patterns
2. **Simple Discriminator**: Use `kind: "enum"` for type narrowing
3. **No Custom Parser**: Enum values used directly for completions
4. **Fuzzy Matching**: Built-in typo correction via `filterClosestAlternatives`
5. **Variadic Support**: Both flags and positionals support arrays of enums

## Next Steps

1. Review `latest-output.md` for complete implementation details
2. Check `flag-vs-positional-comparison.md` for side-by-side code
3. Use `enum-implementation-summary.md` as quick reference
4. Implement following the pattern in the comparison document
5. Test using examples from the test suite

## Questions Answered

✅ **Where is the enum type defined?** → `packages/core/src/parameter/flag/types.ts:117-215`
✅ **How is validation implemented?** → Scanner checks `values.includes(input)` at lines 594-599
✅ **How are values shown in help?** → `values.join("|")` in flag/formatting.ts:56-59
✅ **How do completions work?** → Direct use of `flag.values` in scanner.ts:1064-1065
✅ **What error is thrown?** → `EnumValidationError` at scanner.ts:209-245
✅ **Are there tests?** → Yes, at scanner.spec.ts:5414-5530
✅ **Is variadic supported?** → Yes, with `variadic: true | ","` flag

---

**Generated**: 2025-01-22  
**Agent**: Scout (Sonnet 4.5)  
**Task**: Explore flag enum implementation for positional argument support
