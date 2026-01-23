# Stricli Contribution Guide

Everything learned from contributing to bloomberg/stricli.

## Quick Reference

| Step | Command | Notes |
|------|---------|-------|
| Create issue | `gh issue create` | Use Feature Request template |
| Create branch | `git checkout -b feat/issue-N-desc` | From updated main |
| Typecheck | `npm run typecheck` | MUST pass |
| Commit | `git commit -s -m "..."` | `-s` adds sign-off |
| Push | `git push -u fork branch` | To your fork |
| PR | `gh pr create --body "Implements #N"` | Link to issue |

## The Golden Rules

1. **Issue First** - Never implement without an approved issue
2. **Sign-off Required** - Every commit needs `Signed-off-by:`
3. **Typecheck Pass** - No PRs with type errors
4. **Follow Patterns** - Copy existing patterns, don't invent new ones

## Type System Patterns

### Branded Type Cross-Casting
```typescript
// When converting between branded string types
placeholder as unknown as ExternalFlagName
```

### Type-Only Imports
```typescript
import type { PositionalParameter } from "./types";
// Not: import { PositionalParameter }
```

### Conditional Type Surprises
```typescript
// T doesn't include undefined → RequiredPositionalParameter
// T includes undefined → OptionalPositionalParameter
type Positional = ["value" | undefined];  // Use this for optional
```

## Test Patterns

- Mirror `src/` structure in `tests/`
- Use `buildArgumentScanner()` for scanner tests
- Use `buildFakeApplicationText()` for completion tests
- Aim for 100% coverage (project requirement)
- **Update snapshots when adding new test cases**

## LOCAL TESTING IS MANDATORY

**Always run CI commands locally before pushing:**

```bash
# Run the full CI suite (this is what CI runs)
npx nx run-many -t format:check lint build coverage

# Individual commands:
npx prettier --config .prettierrc -c .    # Format check
npm run typecheck                          # Type check
npm run lint                               # Lint
npm run build                              # Build
```

**Fix locally FIRST. CI failures waste everyone's time.**

## Workflow Deep Dive

### 1. Discovery Phase (for features)

Before writing code, understand:
- Is the issue approved?
- What files are involved?
- What patterns exist?
- What are the edge cases?
- What's the blast radius?

### 2. Implementation Phase

```bash
# Branch from updated main
git checkout main && git pull origin main
git checkout -b feat/issue-N-description

# Make changes, verify
npm run typecheck  # Must pass

# Commit with sign-off
git add <files>
git commit -s -m "feat: description

Implements #N

Detailed explanation..."
```

### 3. PR Creation

```bash
git push -u fork feat/issue-N-description
gh pr create --title "feat: description" --body "Implements #N"
```

## Fixing Mistakes

### Forgot Sign-off
```bash
git commit --amend --signoff
git push --force-with-lease
```

### Wrong Branch
```bash
git checkout main
git checkout -b correct-branch-name
git cherry-pick wrong-branch  # Or just redo the commit
```

### Need to Update PR
```bash
# Make changes
git add <files>
git commit -s  # New commit
git push  # PR updates automatically
```

## Completed PRs as Reference

| PR | Issue | What |
|----|-------|------|
| #136 | #88 | Enum positionals (deep discovery, 18 tests) |
| #135 | #91 | Aliases with explicit func type |
| #133 | #126 | forCommand documentation |
| #132 | #93 | formatException fix |

## Key Files

| File | Purpose |
|------|---------|
| `.claude/rules/contribution-workflow.md` | Issue-first workflow |
| `.claude/rules/dco-signoff.md` | Sign-off requirements |
| `.claude/rules/typescript-type-patterns.md` | Type patterns |
| `.claude/skills/contribution-workflow/SKILL.md` | Full workflow skill |

## Maintainer Feedback

From CONTRIBUTING.md:
> Create a Feature Request issue, follow the template, get approval, THEN submit PR.

The DCO (Developer's Certificate of Origin) requires:
> Signed-off-by: Real Name <email>

No pseudonyms, no anonymous contributions.
