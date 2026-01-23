# TypeScript Type Patterns

**Context:** Common type system patterns encountered in stricli codebase.

## Branded Type Cross-Casting

When you have two branded string types and need to convert between them:

```typescript
// WRONG - direct cast fails
throw new EnumValidationError(placeholder as ExternalFlagName, ...);

// RIGHT - cast through unknown first
throw new EnumValidationError(placeholder as unknown as ExternalFlagName, ...);
```

Both are just strings with brands, but the brand makes them incompatible. The `as unknown as` pattern safely bridges them.

## Type-Only Imports with verbatimModuleSyntax

When `verbatimModuleSyntax: true` is in tsconfig:

```typescript
// WRONG - value import
import { PositionalParameter } from "./types";

// RIGHT - type-only import
import type { PositionalParameter } from "./types";
```

## Conditional Type Inference Surprises

Conditional types don't always infer what you expect:

```typescript
// This won't work as expected:
type Positional = ["small" | "medium" | "large"];  // No undefined
const parameter = { optional: true, ... };  // ERROR!

// The type system infers RequiredPositionalParameter
// because T doesn't include undefined
```

**Solution:** Either include `undefined` in the union type or use the looser `CommandParameters` type instead of `TypedCommandParameters`.

## Promise Type Assertions

When type assertions are too narrow:

```typescript
// WRONG - Promise<T> constraint too strict
as Promise<PromiseSettledOrElseResult<ARGS>>

// RIGHT - use unknown first
as unknown as Promise<PromiseSettledOrElseResult<ARGS>>
```

## Reading Before Editing

**ALWAYS read the file before making changes.** Grep results are not enough:

```
WRONG: grep found "try.*catch" → "file has error handling"
RIGHT: Read the file → understand context → make precise change
```

## Source Sessions

- Issue #88 implementation: Multiple type errors fixed using these patterns
- Claim-verification rule: 80% false claim rate when trusting grep without reading
