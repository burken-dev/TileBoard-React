# Dependency Update Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep npm, Docker, and GitHub Actions dependencies current, auto-merging safe Dependabot patch/minor updates after required CI while leaving majors manual.

**Architecture:** Dependabot raises weekly update PRs and updates the existing npm lockfile. A narrowly permissioned `pull_request_target` workflow reads Dependabot metadata and enables GitHub auto-merge only for patch/minor updates; branch protection makes CI mandatory before the merge happens.

**Tech Stack:** GitHub Dependabot, GitHub Actions, GitHub CLI, npm, Docker, Prettier, actionlint.

**Spec:** `docs/superpowers/specs/2026-11-25-dependency-updates-design.md`

## Global Constraints

- Work on `chore/dependency-updates`; never commit directly to `main`.
- Rebase on latest `origin/main` before opening or updating the PR.
- Use rebase merges only; no merge commits.
- Required checks are exactly `lint` and `docker-build`, with branches required to be up to date.
- Auto-merge only `version-update:semver-patch` and `version-update:semver-minor`; never `version-update:semver-major`.
- Do not check out or execute code from a Dependabot PR in the write-permissioned job.
- Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` before pushing.

## Review Focus

- A non-Dependabot PR must never reach the write-permissioned merge step. Task 2's workflow assertion pins the author guard.
- A grouped PR containing a major upgrade must never auto-merge. Task 1 pins npm groups to patch/minor; Task 2 allows only patch/minor metadata.
- Missing or failed CI must block merging. Task 3 verifies strict required checks for `lint` and `docker-build`.
- PR-controlled code must not gain the workflow's write token. Task 2 uses `pull_request_target`, pins the metadata action, and asserts there is no checkout.
- An unknown or unclassified update must fail closed. Task 2's exact-equality condition permits only the two approved metadata values.

---

### Task 1: Configure Dependabot

**Files:**

- Create: `.github/dependabot.yml`

**Interfaces:**

- Consumes: root `package.json`, `package-lock.json`, and `Dockerfile`; workflows under `.github/workflows/`.
- Produces: weekly update entries for `npm`, `docker`, and `github-actions`; npm groups named `npm-production-patch-minor` and `npm-development-patch-minor`; label `dependencies`.

- [ ] **Step 1: Write the failing configuration check**

Run this Node assertion before creating the file; it must fail because the file does not exist:

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('.github/dependabot.yml', 'utf8');
const ecosystems = [...config.matchAll(/package-ecosystem: ["'](npm|docker|github-actions)["']/g)];
assert.deepEqual(ecosystems.map((match) => match[1]), ['npm', 'docker', 'github-actions']);
assert.equal((config.match(/interval: ["']weekly["']/g) ?? []).length, 3);
assert.equal((config.match(/day: ["']monday["']/g) ?? []).length, 3);
assert.equal((config.match(/time: ["']06:00["']/g) ?? []).length, 3);
assert.equal((config.match(/timezone: ["']Etc\/UTC["']/g) ?? []).length, 3);
assert.match(config, /npm-production-patch-minor:/);
assert.match(config, /npm-development-patch-minor:/);
assert.match(config, /dependency-type: ["']production["']/);
assert.match(config, /dependency-type: ["']development["']/);
assert.equal((config.match(/^          - (minor|patch)$/gm) ?? []).length, 4);
assert.doesNotMatch(config, /^          - major$/m);
assert.equal((config.match(/^      - dependencies$/gm) ?? []).length, 3);
NODE
```

Expected: failure with `ENOENT` for `.github/dependabot.yml`.

- [ ] **Step 2: Create `.github/dependabot.yml`**

Use `version: 2` and three root-directory update entries in this order: `npm`, `docker`, `github-actions`. Each entry uses the weekly Monday 06:00 UTC schedule from Step 1, `open-pull-requests-limit: 10`, and the `dependencies` label. Only the npm entry defines the two groups; each group sets its dependency type and `update-types` to `minor` and `patch`.

- [ ] **Step 3: Run the configuration checks**

Repeat the Step 1 assertion, then run:

```bash
npx --no-install prettier --check .github/dependabot.yml
```

Expected: both commands pass.

- [ ] **Step 4: Commit**

```bash
git add .github/dependabot.yml
git commit -m "Configure weekly dependency updates"
```

### Task 2: Add safe Dependabot auto-merge

**Files:**

- Create: `.github/workflows/dependabot-automerge.yml`

**Interfaces:**

- Consumes: `dependabot/fetch-metadata` output `update-type`; Dependabot PR author; GitHub PR URL.
- Produces: GitHub auto-merge enabled with rebase for approved update types only.

- [ ] **Step 1: Write the failing workflow check**

Run this Node assertion before creating the file; it must fail because the file does not exist:

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/dependabot-automerge.yml', 'utf8');
assert.match(workflow, /pull_request_target:/);
assert.match(workflow, /types: \[opened, synchronize, reopened, ready_for_review\]/);
assert.match(workflow, /github\.event\.pull_request\.user\.login == 'dependabot\[bot\]'/);
assert.match(workflow, /dependabot\/fetch-metadata@d7267f607e9d3fb96fc2fbe83e0af444713e90b7/);
assert.match(workflow, /version-update:semver-patch/);
assert.match(workflow, /version-update:semver-minor/);
assert.doesNotMatch(workflow, /version-update:semver-major/);
assert.match(workflow, /gh pr merge --auto --rebase/);
assert.match(workflow, /contents: write/);
assert.match(workflow, /pull-requests: write/);
assert.doesNotMatch(workflow, /actions\/checkout/);
NODE
```

Expected: failure with `ENOENT` for `.github/workflows/dependabot-automerge.yml`.

- [ ] **Step 2: Create `.github/workflows/dependabot-automerge.yml`**

Create a workflow named `Dependabot auto-merge` with these exact decisions:

- Trigger: `pull_request_target` with `opened`, `synchronize`, `reopened`, and `ready_for_review` types, rendered on one line to match the Step 1 assertion.
- Permissions: `contents: write` and `pull-requests: write` only.
- One job named `automerge`, guarded by `github.event.pull_request.user.login == 'dependabot[bot]'`.
- First step: `dependabot/fetch-metadata` pinned to `d7267f607e9d3fb96fc2fbe83e0af444713e90b7`, id `metadata`, using `${{ secrets.GITHUB_TOKEN }}`.
- Second step: run only when `steps.metadata.outputs.update-type` exactly equals `version-update:semver-patch` or `version-update:semver-minor`.
- Merge command: `gh pr merge --auto --rebase "$PR_URL"`, with `PR_URL` from `${{ github.event.pull_request.html_url }}` and `GH_TOKEN` from `${{ secrets.GITHUB_TOKEN }}` passed through environment variables.
- Do not add a checkout step.

- [ ] **Step 3: Run the workflow checks**

Repeat the Step 1 assertion, then run:

```bash
npx --no-install prettier --check .github/dependabot.yml .github/workflows/dependabot-automerge.yml
docker run --rm --volume "$PWD":/repo --workdir /repo rhysd/actionlint:1.7.7 -color
```

Expected: assertions pass, Prettier passes, and actionlint reports no errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/dependabot-automerge.yml
git commit -m "Auto-merge safe Dependabot updates"
```

### Task 3: Document release checks and enable repository safeguards

**Files:**

- Modify: `README.md`, in the `Contribution` section after the existing contribution paragraph.

**Interfaces:**

- Consumes: Dependabot policy from Task 1 and auto-merge workflow from Task 2.
- Produces: documented release checklist; repository auto-merge, vulnerability alerts, automated security fixes, `dependencies` label, and protected `main`.

- [ ] **Step 1: Add the dependency-maintenance documentation**

Add a `### Dependency maintenance` subsection stating:

- Dependabot checks npm, Docker base images, and GitHub Actions weekly.
- Patch/minor updates auto-merge after required CI; major updates need manual review.
- Security updates follow the same semver rule.
- Before tagging `v*`, review `npm outdated` and pending major PRs, run `npm audit --omit=dev`, resolve or document high/critical findings, and run lint, typecheck, tests, and build.

Include the four verification commands as a fenced shell block.

- [ ] **Step 2: Check the documentation**

Run:

```bash
npx --no-install prettier --check README.md
git diff --check
```

Expected: both commands pass.

- [ ] **Step 3: Create the label and enable security/auto-merge settings**

Run:

```bash
gh label create dependencies --color 0969da --description "Dependency updates" --force
gh api --method PUT 'repos/{owner}/{repo}/vulnerability-alerts'
gh api --method PUT 'repos/{owner}/{repo}/automated-security-fixes'
gh api --method PATCH 'repos/{owner}/{repo}' -F allow_auto_merge=true
```

Expected: the label command succeeds; both security endpoints return success; the final JSON contains `"allow_auto_merge": true`.

- [ ] **Step 4: Protect `main` with required CI**

Run:

```bash
gh api --method PUT 'repos/{owner}/{repo}/branches/main/protection' --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "docker-build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
JSON
```

Expected: HTTP success. This intentionally adds no blanket review requirement, so approved Dependabot updates can merge automatically.

- [ ] **Step 5: Verify the repository settings**

Run:

```bash
gh api 'repos/{owner}/{repo}' --jq '.allow_auto_merge'
gh api 'repos/{owner}/{repo}/branches/main/protection' --jq '{strict: .required_status_checks.strict, contexts: .required_status_checks.contexts, reviews: .required_pull_request_reviews}'
gh api 'repos/{owner}/{repo}/labels/dependencies' --jq '.name'
```

Expected: `true`; strict checks with exactly `lint` and `docker-build` and null reviews; label name `dependencies`.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "Document dependency release checks"
```

### Task 4: Verify and open the pull request

**Files:**

- Modify: none.

**Interfaces:**

- Consumes: all committed changes from Tasks 1–3.
- Produces: verified branch pushed to `origin/chore/dependency-updates` and a PR targeting `main`.

- [ ] **Step 1: Rebase on latest main**

Run:

```bash
git fetch origin main
git rebase origin/main
```

Expected: clean rebase with no conflicts.

- [ ] **Step 2: Run full local verification**

Run:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx --no-install prettier --check .github/dependabot.yml .github/workflows/dependabot-automerge.yml README.md
git diff --check
```

Expected: every command passes.

- [ ] **Step 3: Push and open the PR**

Run:

```bash
git push --force-with-lease -u origin chore/dependency-updates
gh pr create --base main --title "Automate dependency updates" --body "Add weekly Dependabot updates for npm, Docker, and GitHub Actions. Auto-merge patch/minor updates after required CI, keep majors manual, enable security alerts, and document release dependency checks."
```

Expected: PR URL targeting `main`.

- [ ] **Step 4: Confirm CI**

Run `gh pr checks --watch`, then report the PR URL and check results. Do not merge the PR unless the user asks.

## Self-Review

- Spec coverage: weekly ecosystems, security settings, grouping, auto-merge policy, required checks, rebase-only merges, and release documentation are each assigned to a task.
- Step scan: configuration values, assertions, commands, and expected outcomes are explicit.
- Type consistency: metadata id is `metadata`; output is `update-type`; approved values match the spec exactly.
- Review focus: each listed failure mode has an assertion or repository-settings verification in its owning task.
- Proportion: the plan pins configuration and safety checks without embedding application code.
