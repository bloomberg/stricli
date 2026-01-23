# Local Testing Rule

**Context:** CI failures on PR #136 - format issues, missing snapshots, test failures. All could have been caught locally.

## The Rule

**NEVER push to PR without running CI commands locally first.**

CI failures waste:
- Maintainer's time (they review broken PRs)
- Your time (fix → push → wait → repeat)
- CI resources (repeated runs)

## Before Every Push

```bash
# Run the FULL CI suite locally
npx nx run-many -t format:check lint build coverage
```

If ANY of these fail, fix BEFORE pushing:
- `format:check` - Run `npx prettier --write .` to fix
- `lint` - Fix lint errors
- `build` - Fix build errors
- `coverage` - Fix test failures, update snapshots

## Quick Iteration vs Full Check

| Situation | Safe to Skip | Must Run |
|-----------|-------------|----------|
| Typo fix | Nothing | `format:check`, typecheck |
| Type refactor | Nothing | typecheck, `format:check` |
| New feature | Nothing | ALL |
| Snapshot change | coverage | `format:check` |

**When in doubt, run everything.**

## Snapshot Updates

When adding new test cases that use `toMatchSnapshot()`:

1. Tests will fail with "Snapshot mismatched"
2. Run with `-u` flag: `npx vitest run -u`
3. Review the `.snap` file changes
4. Commit the updated snapshots

## Common CI Failures

| Error | Fix |
|-------|-----|
| `Code style issues found` | `npx prettier --write .` |
| `Snapshot mismatched` | `npx vitest run -u` |
| Test failure | Fix test or code |
| Type error | Fix type issue |

## Source Sessions

- PR #136: CI failed with format issues, missing snapshots, satisfaction test failure
- Lesson: All could have been caught with `npx nx run-many -t format:check lint build coverage`
