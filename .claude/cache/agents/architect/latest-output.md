# Positional Enum API Analysis Summary

## Key Findings

### 1. API Shape Recommendation: Use `kind: "enum"` + `values` array

**Proposed interface:**
```typescript
export interface BaseEnumPositionalParameter<T extends string> {
    readonly kind: "enum";
    readonly values: readonly T[];
    readonly default?: T;
    readonly brief: string;
    readonly placeholder?: string;
    readonly optional?: boolean;
}
```

### 2. Consistency with Flag Enums

| Aspect | Flag | Positional | Decision |
|--------|------|------------|----------|
| Discriminator | `kind: "enum"` | `kind: "enum"` | **MATCH** |
| Values property | `values: readonly T[]` | `values: readonly T[]` | **MATCH** |
| Optional | `optional: boolean` | `optional: boolean` | **MATCH** |
| Variadic | `variadic: boolean \| string` | Array wrapper | **DIFFERENT** (by design) |
| Hidden | `hidden?: boolean` | N/A | N/A |

### 3. No Breaking Changes to Existing Code

The design is additive:
- New `BaseEnumPositionalParameter` type added to union
- Existing positional parameters continue to use `parse` function
- Kind discrimination ensures type safety

### 4. Variadic Positionals Use Array Wrapper

Unlike flags which use `variadic: true | ","`, positionals use:
```typescript
positional: {
    kind: "array",
    parameter: { kind: "enum", values: [...] },
    minimum: 1,
    maximum: 3
}
```

This maintains consistency with existing positional array handling.

### 5. Implementation Locations

| Component | File | Change Type |
|-----------|------|-------------|
| Type definitions | `positional/types.ts` | Add new interfaces |
| Validation | `scanner.ts` | Add enum check in positional parsing |
| Help text | `positional/formatting.ts` | Add values display |
| Completions | `scanner.ts` | Use values directly |
| Tests | `scanner.spec.ts` (new) | Add comprehensive tests |

## Files Modified

- **Plan written:** `/Users/nickita/storage/stricli/thoughts/shared/plans/positional-enum-api-plan.md`
- **Summary:** `/Users/nickita/storage/stricli/.claude/cache/agents/architect/latest-output.md`
