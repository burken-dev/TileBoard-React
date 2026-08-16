---
description: Start a GitHub Flow feature branch from fresh main.
---

Start a short-lived GitHub Flow branch. Use $ARGUMENTS as the branch name (e.g. `feature/foo`).

1. Verify the working tree is clean: `git status --porcelain` should be empty. If there are uncommitted changes, ask the user whether to commit them or stash them first.
2. Reset to fresh `main` (self-heals a stale branch): `git checkout main && git pull --prune origin main`.
3. Delete stale local branches merged into main: `git branch --merged main | grep -v 'main' | xargs -r git branch -d`.
4. Create and check out the branch: `git checkout -b $ARGUMENTS`.
5. Confirm with the branch name and current branch state.