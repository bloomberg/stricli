# Codebase Report: Enum Validation Error Handling Consistency
Generated: 2025-01-23

## Summary
Compared flag enum vs positional enum validation and error handling in PR #136. Found **inconsistencies** in how EnumValidationError is used between flag and positional enums.

## Questions Answered

### Q1: How do flag enums validate input?
**Location:** `/Users/nickita/storage/stricli/packages/core/src/parameter/scanner.ts`

**Flag enum validation (lines 594-599):**
```typescript
if (flag.kind === "enum") {
    if (!flag.values.includes(input)) {
        const corrections = filterClosestAlternatives(input, flag.values, config.distanceOptions);
        throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
    }
    return input;
}
```

**Variadic flag enum validation (lines 574-582):**
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

**Flag enum default validation (lines 534-542):**
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
}
```

### Q2: How do positional enums validate input?
**Location:** `/Users/nickita/storage/stricli/packages/core/src/parameter/scanner.ts` (lines 830-868)

**Positional enum validation (lines 860-863):**
```typescript
if (!positional.values.includes(input)) {
    const corrections = filterClosestAlternatives(input, positional.values, config.distanceOptions);
    throw new EnumValidationError(placeholder as unknown as ExternalFlagName, input, positional.values, corrections);
}
```

**Positional enum default validation (lines 838-845):**
```typescript
if (!positional.values.includes(positional.parameter.default)) {
    const corrections = filterClosestAlternatives(
        positional.parameter.default,
        positional.values,
        config.distanceOptions,
    );
    throw new EnumValidationError(placeholder as unknown as ExternalFlagName, positional.parameter.default, positional.values, corrections);
}
```

### Q3: What error types are used?
**Same error type:** Both use `EnumValidationError` (defined at lines 209-245)

**Error message format (line 228):**
```typescript
let message = `Expected "${input}" to be one of (${values.join("|")})`;
if (corrections.length > 0) {
    const formattedCorrections = joinWithGrammar(
        corrections.map((str) => `"${str}"`),
        { kind: "conjunctive", conjunction: "or", serialComma: true },
    );
    message += `, did you mean ${formattedCorrections}?`;
}
```

**Example from test (scanner.spec.ts:10817):**
```
Expected "x" to be one of (a|b|c), did you mean "a", "b", or "c"?
```

### Q4: Typo/suggestion logic?
**Same logic:** Both use `filterClosestAlternatives` from `/Users/nickita/storage/stricli/packages/core/src/util/distance.ts` (lines 160-173)

**Implementation:**
```typescript
export function filterClosestAlternatives(
    target: string,
    alternatives: readonly string[],
    options: DamerauLevenshteinOptions,
): readonly string[] {
    const validAlternatives = alternatives
        .map<AlternativeWithEditDistance>((alt) => [alt, damerauLevenshtein(target, alt, options)])
        .filter(([, dist]) => dist <= options.threshold);
    const minDistance = Math.min(...validAlternatives.map(([, dist]) => dist));
    return validAlternatives
        .filter(([, dist]) => dist === minDistance)
        .sort((a, b) => compareAlternatives(a, b, target))
        .map(([alt]) => alt);
}
```

## Inconsistencies Found

### 1. Type Cast Pattern Difference

**Flag enums:** Use `externalFlagName` directly (already correct type)
```typescript
throw new EnumValidationError(externalFlagName, input, flag.values, corrections);
```

**Positional enums:** Use `placeholder as unknown as ExternalFlagName`
```typescript
throw new EnumValidationError(placeholder as unknown as ExternalFlagName, input, positional.values, corrections);
```

**Analysis:** This is necessary because:
- `placeholder` is of type `Placeholder` (branded string: `string & { readonly __Placeholder: unique symbol }`)
- `ExternalFlagName` is a different branded string: `string & { readonly __ExternalFlagName: unique symbol }`
- TypeScript treats these as incompatible types
- The `as unknown as` pattern bridges them (documented in `typescript-type-patterns.md`)

**Impact:** The `externalFlagName` field in `EnumValidationError` contains the placeholder for positional enums, but is misnamed semantically.

### 2. Error Message Semantics

**For flag enum:** The error message references the flag name
```typescript
// externalFlagName = "logLevel"
// Error: Expected "invalid" to be one of (info|warn|error), did you mean "info"?
```

**For positional enum:** The error message references the placeholder
```typescript
// placeholder = "size"
// Error: Expected "invalid" to be one of (small|medium|large), did you mean "small"?
```

**Issue:** The error class field is named `externalFlagName` but for positional enums it's actually a placeholder.

### 3. No Missing Validation Scenarios

✓ Flag enum: validates user input (line 597)
✓ Flag enum: validates variadic inputs (line 579)
✓ Flag enum: validates default values (line 540)
✓ Positional enum: validates user input (line 862)
✓ Positional enum: validates default values (line 844)

**Coverage:** All validation scenarios are covered consistently.

## Error Message Format Consistency

| Scenario | Flag Enum | Positional Enum | Consistent? |
|----------|-----------|-----------------|-------------|
| Invalid input | `Expected "X" to be one of (a\|b\|c), did you mean "a"?` | Same format | ✅ Yes |
| No close match | `Expected "X" to be one of (a\|b\|c)` | Same format | ✅ Yes |
| Invalid default | Same validation | Same validation | ✅ Yes |

## Test Coverage Comparison

**Flag enum tests:** `/Users/nickita/storage/stricli/packages/core/tests/parameter/scanner.spec.ts`
- Line 10817: Tests error message format with suggestions
- Uses `EnumValidationError` constructor directly

**Positional enum tests:** `/Users/nickita/storage/stricli/packages/core/tests/parameter/positional/enum.spec.ts`
- Line 91-111: Tests rejection with suggestions
- Line 113-134: Tests rejection without suggestions (too different)
- Line 460-494: Tests multi-word enum typo suggestions

**Test consistency:** Both test the same scenarios (with/without suggestions).

## Open Questions

1. **Semantic naming:** Should `EnumValidationError.externalFlagName` be renamed to something more generic like `parameterName` since it can be either a flag or a placeholder?

2. **Type safety:** The `as unknown as` cast works but loses type safety. Could a union type be used instead?
   ```typescript
   readonly externalFlagNameOrPlaceholder: ExternalFlagName | Placeholder;
   ```

3. **Documentation:** The JSDoc for `EnumValidationError` says "External name of flag" which is misleading for positional enums.

## Key Files
| File | Purpose | Lines |
|------|---------|-------|
| `packages/core/src/parameter/scanner.ts` | Validation logic | 209-245 (error class), 594-599 (flag enum), 860-863 (positional enum) |
| `packages/core/src/util/distance.ts` | Suggestion logic | 160-173 |
| `packages/core/tests/parameter/scanner.spec.ts` | Flag enum tests | 10807-10836 |
| `packages/core/tests/parameter/positional/enum.spec.ts` | Positional enum tests | Full file |

## Conclusion

**Validation consistency:** ✅ Both use identical validation logic and error types
**Error message format:** ✅ Both produce identical error messages
**Suggestion logic:** ✅ Both use the same `filterClosestAlternatives` function
**Type handling:** ⚠️ Positional enums require `as unknown as` cast due to branded string types
**Semantic naming:** ⚠️ Error class field name `externalFlagName` is misleading for positional enums

**No functional inconsistencies found.** The implementation is consistent in behavior, with only minor type-system workarounds for positional enums.
