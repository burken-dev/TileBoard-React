# Agent guidelines

## Git workflow: GitHub Flow

- `main` is always deployable. Never commit to `main` directly.
- Every change ships on a short-lived branch: `feature/<desc>`, `fix/<desc>`, `chore/<desc>`.
- Push the branch and open a PR to `main` — even for one-line changes. Use `gh`.
- Rebase the branch on latest `main` before opening/updating a PR. No merge commits.
- After the PR merges, delete the branch locally and remotely.
- Commit messages: imperative present tense, e.g. "Add dark mode toggle".
- To start work, use `/start-branch <name>`.

## Verification

Run all of these before pushing a branch:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`