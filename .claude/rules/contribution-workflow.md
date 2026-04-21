# Contribution Workflow Rule

**Context:** Based on stricli project contribution guidelines and multiple PRs created.

## The Golden Rule

**NEVER implement first, create PR later.**

The correct flow is:
1. **Issue first** - Create Feature Request issue
2. **Get approval** - Wait for maintainer approval
3. **Implement** - Write the code
4. **Create PR** - Link to issue with `Fixes #XXX`

## Why This Order Matters

| Wrong | Right |
|-------|--------|
| Implement → PR → wait | Issue → approve → implement → PR |
| Wasted effort if rejected | No wasted effort |
| No discussion of approach | Approach discussed first |
| May miss requirements | Requirements clarified upfront |

## Pre-Implementation Checklist

Before writing ANY code:

- [ ] Issue exists and is approved
- [ ] Issue template was followed
- [ ] You understand the existing patterns
- [ ] You know which files to modify

## PR Requirements

Every PR must:
- Link to an issue: `Fixes #XXX` or `Refs #XXX`
- Have `Signed-off-by` in commit (see `dco-signoff.md`)
- Pass all tests
- Pass typecheck (`npm run typecheck`)
- Follow existing code patterns

## Source Sessions

- stricli-contribution-workflow: Multiple PRs created, learned proper flow from CONTRIBUTING.md
- Issue #88: Deep discovery with 8 agents BEFORE implementing
- Issue #91, #93, #126: Direct fixes (issues already existed)
