---
description: Return to fresh main after a PR has been merged.
---

Run this right after merging a PR (e.g. manually on GitHub) while still on the merged branch.

1. Verify the working tree is clean: `git status --porcelain` should be empty. If there are uncommitted changes, ask the user whether to commit them or stash them first.
2. Switch to `main`: `git checkout main`.
3. Pull latest and prune remote-tracking refs: `git pull --prune origin main`.
4. Delete the branch you were just on (safe delete — only works if fully merged): `git branch -d <previous-branch>`.
5. Clean up any other merged local branches: `git branch --merged main | grep -v 'main' | xargs -r git branch -d`.