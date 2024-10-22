#!/usr/bin/env bash

declare -A path_label_mapping

repo_path="packages/core";           path_label_mapping[$repo_path]="core ⚙"
repo_path="packages/auto-complete";  path_label_mapping[$repo_path]="auto-complete 🔮"
repo_path="packages/create-app";     path_label_mapping[$repo_path]="create-app 📂"
repo_path="docs";                    path_label_mapping[$repo_path]="documentation 📝"
repo_path=".github/workflows";       path_label_mapping[$repo_path]="ci 🤖"

diff_result=$(git diff --name-only origin/main..HEAD)

for repo_path in "${!path_label_mapping[@]}"
do
    if [[ "${diff_result[*]}" =~ $repo_path/* ]]; then
        echo "Change found in $repo_path, adding label ${path_label_mapping[$repo_path]}"
        gh pr edit $DRONE_PULL_REQUEST --add-label "${path_label_mapping[$repo_path]}"
    else
        echo "No changes found in $repo_path, removing label ${path_label_mapping[$repo_path]}"
        gh pr edit $DRONE_PULL_REQUEST --remove-label "${path_label_mapping[$repo_path]}"
    fi
done
