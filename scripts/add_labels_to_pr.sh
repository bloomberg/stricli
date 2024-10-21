#!/usr/bin/env bash

diff_result=$(git diff --name-only origin/main..HEAD)

if [[ "${diff_result[*]}" =~ packages/core/* ]]; then
    echo "Change found in packages/core, adding label for core"
    gh pr edit $PR_NUMBER --add-label "core ⚙"
else
    echo "No changes found in packages/core, removing label for core"
    gh pr edit $PR_NUMBER --remove-label "core ⚙"
fi

if [[ "${diff_result[*]}" =~ packages/auto-complete/* ]]; then
    echo "Change found in packages/auto-complete, adding label for auto-complete"
    gh pr edit $PR_NUMBER --add-label "auto-complete 🔮"
else
    echo "No changes found in packages/auto-complete, removing label for auto-complete"
    gh pr edit $PR_NUMBER --remove-label "auto-complete 🔮"
fi

if [[ "${diff_result[*]}" =~ packages/create-app/* ]]; then
    echo "Change found in packages/create-app, adding label for create-app"
    gh pr edit $PR_NUMBER --add-label "create-app 📂"
else
    echo "No changes found in packages/create-app, removing label for create-app"
    gh pr edit $PR_NUMBER --remove-label "create-app 📂"
fi

if [[ "${diff_result[*]}" =~ docs/* ]]; then
    echo "Change found in docs, adding label for documentation"
    gh pr edit $PR_NUMBER --add-label "documentation 📝"
else
    echo "No changes found in docs, removing label for documentation"
    gh pr edit $PR_NUMBER --remove-label "documentation 📝"
fi

if [[ "${diff_result[*]}" =~ .github/workflows/* ]]; then
    echo "Change found in .github/workflows, adding label for ci"
    gh pr edit $PR_NUMBER --add-label "ci 🤖"
else
    echo "No changes found in .github/workflows, removing label for ci"
    gh pr edit $PR_NUMBER --remove-label "ci 🤖"
fi
