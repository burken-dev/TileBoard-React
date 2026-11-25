# Dependency update automation

Date: 2026-11-25

## Intent

Keep npm dependencies, Docker base images, and GitHub Actions current without
manual update hunts. Safe patch/minor updates should merge automatically after
required checks; major updates remain manual.

## Current state

- npm dependencies are pinned by the committed `package-lock.json`; most
  `package.json` ranges use `^`.
- Pull-request CI runs lint, type checks, tests, and a Docker build. The Docker
  build also compiles the production bundle.
- There is no Dependabot configuration or dependency-update workflow.
- GitHub vulnerability alerts are disabled.
- Repository auto-merge is disabled, `main` has no protection rules, and only
  rebase merges are allowed.

## Goals

- Check npm, Docker, and GitHub Actions for updates weekly.
- Raise security updates immediately when GitHub reports them.
- Auto-merge Dependabot patch/minor updates only after required CI passes and
  the branch is current.
- Keep major updates as individual, manually reviewed pull requests.
- Reduce update noise by grouping npm patch/minor updates separately for
  production and development dependencies.
- Document a short dependency check to run before tagging a release.

## Non-goals

- Automatically merging major updates.
- Automatically creating release tags or publishing images.
- Replacing npm, changing the Node.js version, or introducing a dependency
  dashboard.
- Making `npm audit` a CI gate for every pull request; existing vulnerabilities
  should be handled through the release checklist and security alerts.

## Policy

| Ecosystem | Schedule | Patch/minor | Major |
| --- | --- | --- | --- |
| npm | Weekly | Grouped PR, auto-merge after CI | Individual PR, manual |
| Docker base images | Weekly | Auto-merge after CI | Manual |
| GitHub Actions | Weekly | Auto-merge after CI | Manual |

A security fix follows the same semver rule: patch/minor fixes can auto-merge
after CI; fixes requiring a major upgrade are manual. Dependabot security alerts
and automated security fixes will be enabled at the repository level.

“Safe” means all of the following:

- The PR author is `dependabot[bot]`.
- Dependabot metadata classifies the update as semver patch or minor. npm groups
  are explicitly restricted to those update types so a group cannot contain a
  major upgrade.
- Required `lint` and `docker-build` checks pass.
- The branch is up to date with `main` and has no conflicts.

## Implementation shape

1. Add `.github/dependabot.yml` with weekly npm, Docker, and GitHub Actions
   entries. Give update PRs a `dependencies` label. Group npm production and
   development patch/minor updates separately.
2. Add a small GitHub Actions workflow for Dependabot PRs. It will:
   - run only when the author is `dependabot[bot]`;
   - read update metadata with `dependabot/fetch-metadata`;
   - enable auto-merge with `gh pr merge --auto --rebase` only for semver patch
     or minor updates.
3. Keep the auto-merge job narrowly permissioned (`contents: write` and
   `pull-requests: write`) and do not check out or execute Dependabot's branch
   in that job. The existing CI jobs remain responsible for running project
   code.
4. Enable repository auto-merge and protect `main` by requiring the existing
   `lint` and `docker-build` status checks and requiring branches to be up to
   date. Keep rebase-only merges; do not add a blanket review requirement that
   would block the agreed automatic updates. Major updates are merged manually
   by maintainers.
5. Enable vulnerability alerts and automated security fixes.
6. Add a dependency-maintenance section to the README with the release check:
   review `npm outdated`, run `npm audit --omit=dev`, review pending major
   upgrades, and record any accepted exceptions before tagging `v*`.

## Approaches considered

- **GitHub Dependabot (chosen):** built into GitHub, covers all three ecosystems,
  updates the lockfile, and works with the existing CI. It needs one config file,
  one workflow, and repository settings, with no new hosted service.
- **Renovate:** stronger grouping and policy controls, but adds another app and
  substantially more configuration. Revisit only if Dependabot's PR volume or
  policy limits become a problem.
- **Manual release-only updates:** no setup, but allows drift and delays security
  fixes. It does not meet the agreed goal.

## Risks and limits

- Semver and CI reduce risk but cannot prove that a minor release preserves all
  real Home Assistant, browser, camera, or hardware behavior. Auto-merged updates
  should still be observable in normal use and reversible through git.
- Required checks must exist before auto-merge is enabled, otherwise updates
  could merge without the agreed verification.
- Repository settings changes affect all contributors and require admin access.

## Approval

Approve this design before implementation. After approval, the next step is a
short implementation plan.
