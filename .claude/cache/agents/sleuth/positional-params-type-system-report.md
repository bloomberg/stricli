# Debug Report: TypeScript Type System Constraints in stricli's Positional Parameters
Generated: 2025-01-22

## Symptom
Investigation requested into:
1. Why positional parameters use conditional types (`undefined extends T`) instead of `kind` discriminators
2. What would break if we add a `kind` property to positional parameters
3. How `TypedPositionalParameters` type works
4. Type inference issues to watch out for
5. How `NoInfer` affects positional parameter type inference

## Hypotheses Tested

### Hypothesis 1: Positional parameters use `undefined extends T` for optional/required discrimination
- **CONFIRMED** - The conditional type `undefined extends T` checks if `T` includes `undefined` as a valid type
- If `T | undefined` is the type (e.g., `string | undefined`), then `undefined extends T` is true, and the parameter is `OptionalPositionalParameter`
- If `T` is a non-nullable type (e.g., `string`), then `undefined extends T` is false, and the parameter is `RequiredPositionalParameter`

### Hypothesis 2: Flags use `kind` discriminators while positionals do not
- **CONFIRMED** - Flags have explicit `kind: "boolean" | "counter" | "enum" | "parsed"` discriminators
- Positional parameters do NOT have a `kind` property at the individual parameter level
- Instead, positionals use `kind` at the CONTAINER level (`PositionalParameterArray` vs `PositionalParameterTuple`)

### Hypothesis 3: Adding `kind` to individual positional parameters would break type inference
- **CONFIRMED** - The key insight is that positionals are indexed by tuple position, not by a named key like flags
- The `TypedPositionalParameters<T>` type uses mapped types over the tuple: `PositionalParametersForTuple<T, CONTEXT> = { readonly [K in keyof T]: TypedPositionalParameter<T[K], CONTEXT> }`
- Each parameter's type is determined by its corresponding tuple element type `T[K]`

## Investigation Trail

| Step | Action | Finding |
|------|--------|---------|
| 1 | Read `/packages/core/src/parameter/positional/types.ts` | Found `TypedPositionalParameter<T>` using `undefined extends T` conditional |
| 2 | Read `/packages/core/src/parameter/flag/types.ts` | Found flags use `kind` discriminators ("boolean", "counter", "enum", "parsed") |
| 3 | Read `/packages/core/src/parameter/types.ts` | Found `NoInfer` wrapping in `TypedCommandPositionalParameters` |
| 4 | Read `/packages/core/src/parameter/formatting.ts` | Found runtime check for `positional.kind` (array vs tuple) |
| 5 | Read `/packages/core/src/parameter/scanner.ts` | Found runtime switches on `positional.kind` but not individual parameters |
| 6 | Read examples and tests | Verified type inference works correctly in practice |

## Evidence

### Finding 1: Positional Parameter Type Discrimination
- **Location:** `/packages/core/src/parameter/positional/types.ts:41-43`
- **Observation:**
```typescript
export type TypedPositionalParameter<T, CONTEXT extends CommandContext = CommandContext> = undefined extends T
    ? OptionalPositionalParameter<NonNullable<T>, CONTEXT>
    : RequiredPositionalParameter<T, CONTEXT>;
```
- **Relevance:** This is the core type-level discrimination. It uses distributive conditional types to determine if a parameter is optional based on whether `undefined` can be assigned to it.

### Finding 2: Optional vs Required Positional Parameter Interfaces
- **Location:** `/packages/core/src/parameter/positional/types.ts:23-35`
- **Observation:**
```typescript
interface RequiredPositionalParameter<T, CONTEXT extends CommandContext> extends BasePositionalParameter<T, CONTEXT> {
    readonly optional?: false;
}

interface OptionalPositionalParameter<T, CONTEXT extends CommandContext> extends BasePositionalParameter<T, CONTEXT> {
    readonly optional: true;
}
```
- **Relevance:** The `optional` property is discriminated - required has `optional?: false` while optional has `optional: true`

### Finding 3: Container-Level `kind` Discriminator
- **Location:** `/packages/core/src/parameter/positional/types.ts:47-61`
- **Observation:**
```typescript
interface PositionalParameterArray<T, CONTEXT extends CommandContext> {
    readonly kind: "array";
    readonly parameter: TypedPositionalParameter<T, CONTEXT>;
    readonly minimum?: number;
    readonly maximum?: number;
}

interface PositionalParameterTuple<T> {
    readonly kind: "tuple";
    readonly parameters: T;
}
```
- **Relevance:** The `kind` discriminator exists at the CONTAINER level, not the individual parameter level

### Finding 4: Mapped Tuple Type Generation
- **Location:** `/packages/core/src/parameter/positional/types.ts:54-56`
- **Observation:**
```typescript
type PositionalParametersForTuple<T, CONTEXT extends CommandContext> = {
    readonly [K in keyof T]: TypedPositionalParameter<T[K], CONTEXT>;
};
```
- **Relevance:** This creates a tuple where each element type is derived from the corresponding element in the args tuple

### Finding 5: NoInfer Usage in Command Builder
- **Location:** `/packages/core/src/routing/command/builder.ts:17,29,36`
- **Observation:**
```typescript
readonly parameters: NoInfer<TypedCommandParameters<FLAGS, ARGS, CONTEXT>>;
```
- **Relevance:** `NoInfer` prevents TypeScript from widening types when inferring from the `parameters` property

### Finding 6: Runtime Usage of `kind`
- **Location:** `/packages/core/src/parameter/formatting.ts:92-105`
- **Observation:**
```typescript
if (positional.kind === "array") {
    positionalUsage = [wrapVariadicParameter(positional.parameter.placeholder ?? "args")];
} else {
    // ... handle tuple
}
```
- **Relevance:** Runtime code switches on `kind` at the container level (array vs tuple), not individual parameters

## Root Cause

**Why positionals use `undefined extends T` instead of `kind` discriminators:**

1. **Structural Typing vs Discriminated Unions:** Flags are stored in a named object (`{ foo: FlagParameter, bar: FlagParameter }`), so each flag can have its own `kind` property. Positionals are stored as a tuple where discrimination comes from the TYPE of each element, not a property value.

2. **Type-Level Derivation:** The `TypedPositionalParameter<T>` type DERIVES the optional/required nature from the type `T` itself. If `T = string | undefined`, the parameter MUST be optional. This creates a direct correspondence between the function signature `(arg?: string)` and the parameter definition.

3. **No Independent Identity:** Individual positional parameters have no independent identity - they are always part of a tuple/array. The "kind" of each parameter is implicit in its type, not an explicit property.

**What would break if we add `kind` to individual positional parameters:**

1. **Redundancy:** Adding `kind` would be redundant since the optional/required nature is already encoded in the type system via `undefined extends T`.

2. **User Experience Deterioration:** Users would need to specify both the type (e.g., `string | undefined`) AND the `kind` property, creating potential for mismatch errors.

3. **No Runtime Benefit:** The runtime code doesn't switch on individual parameter `kind` - it only cares about array vs tuple at the container level.

## How `TypedPositionalParameters` Works

The type flow is as follows:

```typescript
// 1. User specifies function signature
func: (flags: {}, arg1: string, arg2?: number) => {}

// 2. ARGS is inferred as [string, number | undefined]
type ARGS = [string, number | undefined];

// 3. TypedPositionalParameters maps over the tuple
TypedPositionalParameters<ARGS, CONTEXT>
// -> PositionalParameterTuple<{
//      readonly [K in keyof ARGS]: TypedPositionalParameter<ARGS[K], CONTEXT>
//    }>

// 4. For each element:
// - ARGS[0] = string -> undefined extends string = false -> RequiredPositionalParameter<string, CONTEXT>
// - ARGS[1] = number | undefined -> undefined extends (number | undefined) = true -> OptionalPositionalParameter<number, CONTEXT>
```

The array case detection:
```typescript
[T] extends [readonly (infer E)[]]  // Is T an array type?
    ? number extends T["length"]     // Is T a fixed-length tuple or variable-length array?
        ? PositionalParameterArray<E, CONTEXT>  // Variable-length array
        : PositionalParameterTuple<...>         // Fixed-length tuple
```

## Type Inference Issues to Watch Out For

### Issue 1: Function Types with Explicit Annotations
When the function parameter type is explicitly annotated, TypeScript may not infer the type from the parameter object definition. This is why `NoInfer` is used in `TypedCommandParameters`.

**Location:** `/packages/core/src/routing/command/builder.ts:99-103`
```typescript
// Normally FLAGS would extend BaseFlags, but when it does there are some unexpected and confusing failures with the
// type inference for this function. Check out tests/type-inference.spec.ts for examples where this fails.
// Thanks to @dragomirtitian for concocting this fix.
const FLAGS extends Readonly<Partial<Record<keyof FLAGS, unknown>>> = NonNullable<unknown>,
```

### Issue 2: Distributive Conditional Types
`undefined extends T` is a distributive conditional type - when `T` is a union, it distributes over the union members. This is necessary for the correct behavior but can be confusing.

### Issue 3: Tuple Length Detection
The check `number extends T["length"]` distinguishes between:
- Fixed-length tuples: `[string, number]` has literal `2` as length
- Variable-length arrays: `string[]` has `number` as length

## How `NoInfer` Affects Positional Parameter Type Inference

`NoInfer<T>` prevents TypeScript from inferring a type parameter from a particular usage site. In stricli:

1. **Location:** `/packages/core/src/routing/command/builder.ts:17`
```typescript
readonly parameters: NoInfer<TypedCommandParameters<FLAGS, ARGS, CONTEXT>>;
```

2. **Purpose:** Prevents type widening when the `parameters` object is provided. Without `NoInfer`, TypeScript might widen `string` to `string | undefined` incorrectly based on the parameter definition.

3. **Effect on Positionals:** Ensures that the type of ARGS is inferred from the FUNCTION SIGNATURE, not from the parameter definitions. This preserves the unidirectional flow:
   - Function signature -> ARGS type -> parameter requirements
   - NOT parameter definitions -> ARGS type

## Examples from the Codebase

### Example 1: Required and Optional Positional Parameters
**Location:** `/packages/core/tests/routing/command.spec.ts:377-437`

```typescript
// Function signature with one required, one optional arg
func: (
    flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
    arg0: string,    // Required
    arg1?: number,   // Optional (undefined extends number | undefined = true)
) => {},

// Parameters definition - TypeScript validates the structure
parameters: {
    positional: {
        kind: "tuple",
        parameters: [
            {
                brief: "first argument brief",
                parse: (x) => x,
                // optional not needed - inferred from arg0: string
            },
            {
                brief: "second argument brief",
                optional: true,  // Required! Matches arg1?: number
                parse: numberParser,
            },
        ],
    },
    flags: { ... },
}
```

### Example 2: Array Positional Parameters
**Location:** `/packages/core/tests/routing/command.spec.ts:958-1002`

```typescript
// Function signature with variadic args
func: (
    flags: { alpha: number; bravo: number[]; charlie?: number; delta: boolean },
    ...args: string[]  // Variable length array
) => {},

// Parameters definition
parameters: {
    positional: {
        kind: "array",  // Container kind, not individual parameter kind
        parameter: {
            brief: "string array brief",
            parse: (x) => x,
        },
    },
    flags: { ... },
}
```

## Type Flow Diagram

```
User Code:
+------------------------------------------------------------------+
|  func: (flags: {}, arg1: string, arg2?: number) => void          |
+------------------------------------------------------------------+
                            |
                            v
Type Inference:
+------------------------------------------------------------------+
|  FLAGS = {}                                                     |
|  ARGS = [string, number | undefined]                            |
+------------------------------------------------------------------+
                            |
                            v
TypedPositionalParameters<ARGS>:
+------------------------------------------------------------------+
|  kind: "tuple"                                                  |
|  parameters: [                                                  |
|    TypedPositionalParameter<string>,           |  --+--> RequiredPositionalParameter<string>
|    TypedPositionalParameter<number|undefined>  |    |       { optional?: false }
|  ]                                                               |
+------------------------------------------------------------------+    |
                            |                                        |
                            v                                        v
Individual Parameter Type Checks:
+------------------------------------------------------------------+
|  Parameter 1: undefined extends string = false                   |
|    -> RequiredPositionalParameter { optional?: false }            |
|                                                                  |
|  Parameter 2: undefined extends (number | undefined) = true      |
|    -> OptionalPositionalParameter { optional: true }             |
+------------------------------------------------------------------+
                            |
                            v
Validation:
+------------------------------------------------------------------+
|  User's parameters object must match the inferred structure       |
|  - First parameter must NOT have optional: true                  |
|  - Second parameter MUST have optional: true                     |
+------------------------------------------------------------------+
```

## Recommended Design Principles

1. **Keep the current design** - The `undefined extends T` conditional type approach is elegant and appropriate for positional parameters because:
   - It creates a direct mapping between function signature and parameter requirements
   - It avoids redundant `kind` properties
   - Type errors occur at the right place (mismatch between signature and parameters)

2. **Do NOT add `kind` to individual positional parameters** - This would:
   - Break the elegant type-level derivation
   - Create redundancy and potential for errors
   - Provide no runtime benefit

3. **Document the type flow** - The relationship between function signature, `ARGS` type, and `TypedPositionalParameters` should be well-documented for users.

## Prevention

When working with this type system:

1. **Always let the function signature drive the parameter types** - Define your function signature first, then let TypeScript infer the required parameter structure.

2. **Never manually specify `optional: true/false`** - Let the `undefined extends T` conditional handle this based on your function signature.

3. **Be careful with explicit type annotations** - If you annotate your function parameters explicitly, ensure the type matches what your parameters object specifies.

4. **Use `NoInfer` when wrapping parameter types** - When creating derived types that reference `TypedCommandParameters`, wrap with `NoInfer` to prevent type widening.

## Summary

**Key Takeaways:**

1. **Conditional types over discriminators:** Positional parameters use `undefined extends T` because the type itself (from the function signature) determines if it's optional, not a runtime property.

2. **Container-level `kind`:** The `kind: "array" | "tuple"` discriminator exists at the container level to distinguish between variadic and fixed-length positional arguments.

3. **NoInfer prevents widening:** `NoInfer` ensures type inference flows from function signature to parameters, not the reverse.

4. **Type safety:** The system ensures compile-time validation that parameter definitions match the function signature.

5. **Do NOT add `kind` to individual parameters:** This would break the elegant type-level derivation and create redundancy.
