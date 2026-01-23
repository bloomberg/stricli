# API Consistency Rule

**Context:** Stricli PR #136 feedback - Maintainer pointed out inconsistent API between flag enums and positional enums.

## The Principle

**When adding a feature that mirrors an existing feature, the APIs MUST be identical.**

Users should not have to learn two different patterns for the same concept.

## Real Example

**Flag enums (existing, flat):**
```typescript
flags: {
    level: {
        kind: "enum",
        values: ["debug", "info", "warn"],
        brief: "Log level",        // flat
        optional: true,            // flat
    }
}
```

**Positional enums (initial, nested - WRONG):**
```typescript
positional: {
    kind: "enum",
    values: ["small", "medium", "large"],
    parameter: {                   // NESTED - inconsistent!
        brief: "Size selection",
        optional: true,
    }
}
```

**Positional enums (refactored, flat - CORRECT):**
```typescript
positional: {
    kind: "enum",
    values: ["small", "medium", "large"],
    brief: "Size selection",      // flat
    optional: true,               // flat
}
```

## Checklist Before Implementing

When adding a feature similar to an existing one:

- [ ] Read the existing interface definition
- [ ] Read the existing tests
- [ ] Copy the exact property names and structure
- [ ] Copy the exact help text format
- [ ] Copy the exact validation behavior
- [ ] Copy the exact completion behavior

## What We Missed

The initial PR #136 missed:
1. Nested vs flat structure
2. Default value display in help text
3. Completion satisfaction check
4. Test coverage for formatting

All because we didn't carefully compare against flag enums.

## Root Cause

We focused on "making enum positionals work" rather than "making enum positionals match flag enums exactly."

**Better approach:** Start by copying the flag enum implementation, then adapt minimally for positionals.

## Source Sessions

- PR #136: Initial implementation had nested structure
- Refactor: Used 6 parallel agents to audit and fix all inconsistencies
- Maintainer feedback: "It would be good to have this feature look as identical as possible"
