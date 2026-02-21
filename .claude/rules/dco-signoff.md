# DCO Sign-off Rule

**Context:** Bloomberg stricli project requires Developer's Certificate of Origin (DCO) sign-off.

## Requirement

**EVERY commit must have this line:**

```
Signed-off-by: Your Name <your.email@example.com>
```

## How to Add Sign-off

**For new commits:**
```bash
git commit -s -m "commit message"
# The -s flag automatically adds Signed-off-by
```

**For existing commits (before pushing):**
```bash
git commit --amend --signoff
git push --force-with-lease
```

**After PR is created (if you forgot):**
```bash
git checkout <branch>
git commit --amend --signoff
git push --force-with-lease
# PR will update automatically
```

## Verify Sign-off Exists

```bash
git log -1 --pretty=full | grep -i "signed-off-by"
```

## What Gets Signed

When you sign-off, you're legally certifying:

> I certify that I have the right to submit this contribution under the project's license.

This is the **Developer's Certificate of Origin (DCO)** - same as Linux kernel, Samba, etc.

## Real Name Required

- ✅ `Signed-off-by: Jane Doe <jane@example.com>`
- ❌ `Signed-off-by: janedoe <jane@example.com>` (no pseudonyms)
- ❌ No anonymous contributions

## Source Sessions

- stricli-contribution-workflow: Had to amend 3 PRs (#132, #133, #135) to add missing sign-offs
- Contributing guidelines: https://github.com/bloomberg/stricli/blob/main/.github/CONTRIBUTING.md
