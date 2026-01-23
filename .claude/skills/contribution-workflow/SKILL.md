# Stricli Contribution Workflow

Complete workflow for contributing to the bloomberg/stricli project.

## Prerequisites

- You have forked the repo
- Your fork is added as a remote named `fork`
- You've read the [contributing guidelines](https://github.com/bloomberg/stricli/blob/main/.github/CONTRIBUTING.md)

## Workflow

### Phase 1: Issue Creation (Before Any Code)

**If issue doesn't exist:**

```bash
# Create issue via GitHub CLI
gh issue create --title "Feature: ..." --body "..."
```

Use the Feature Request template and fill it out completely.

**If issue exists:**
- Check if it's approved (maintainer comment, "approved" label, etc.)
- If not approved, WAIT before implementing

### Phase 2: Discovery (For New Features)

For significant features, run deep discovery:

```bash
# Use 8 parallel agents to research
# 1. Is the issue still open?
# 2. Has anyone started working on it?
# 3. What are the related files?
# 4. What patterns exist?
# 5. What tests are needed?
# 6. What are the edge cases?
# 7. What could break?
# 8. Estimate effort
```

**Key questions:**
- Is this approved by maintainers?
- Are there partial implementations?
- What's the estimated effort?
- What's the blast radius?

### Phase 3: Implementation

```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feat/issue-<number>-short-description

# Make your changes
# ... edit files ...

# Typecheck MUST pass
npm run typecheck

# Add your files
git add <files>

# Commit WITH SIGN-OFF
git commit -s -m "feat: description

Implements #<XX>

Detailed description of the change.
"
```

### Phase 4: Create PR

```bash
# Push to your fork
git push -u fork feat/issue-<number>-short-description

# Create PR
gh pr create \
  --title "feat: description" \
  --body "Implements #<XX>

## Changes
- What was changed
- Why it was needed

## Tests
- Tests added/modified
- All tests pass" \
  --base main \
  --head your-username:feat-issue-<number>-short-description
```

## Project-Specific Patterns

### Test Structure

```
packages/core/src/parameter/positional/types.ts
packages/core/tests/parameter/positional/positional.spec.ts
```

Tests mirror src structure.

### Test Helpers

- `buildArgumentScanner()` - Create scanner for testing
- `buildFakeApplicationText()` - Create fake app text for completions
- `defaultScannerConfig` - Standard scanner configuration

### Type Patterns

- Use `CommandParameters` (loose) for tests
- Use `TypedCommandParameters` (strict) for type inference
- Branded types need `as unknown as` for cross-casting
- Type-only imports required with `verbatimModuleSyntax`

## Verification Checklist

Before creating PR:

- [ ] Issue exists and is approved
- [ ] Typecheck passes: `npm run typecheck`
- [ ] Tests pass: `npm test` (or `npx nx test core`)
- [ ] Commit has `Signed-off-by:` line
- [ ] PR body links to issue: `Implements #XX`
- [ ] Changes follow existing patterns

## Common Issues

**Typecheck fails with branded type error:**
Use `as unknown as TargetType` for cross-casting.

**Tests fail with ESM error:**
This is environment issue, verify your changes didn't break it.

**Forgot sign-off:**
```bash
git commit --amend --signoff
git push --force-with-lease
```

## Examples

See these completed PRs:
- #136: Enum positionals (deep discovery + comprehensive tests)
- #135: Aliases with explicit func type (type-level fix)
- #133: forCommand documentation (docs)
- #132: formatException fix (bug fix)
