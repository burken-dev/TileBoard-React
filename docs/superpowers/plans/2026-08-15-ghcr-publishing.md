# GHCR Docker Image Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the TileBoard Docker image to `ghcr.io/<owner>/tileboard` on every `main` merge as a SemVer beta, and on `v*` git tags as a stable image plus a GitHub Release.

**Architecture:** Add one new workflow `publish.yml` triggered by pushes to `main` and by `v*` tags. It logs in to GHCR with `GITHUB_TOKEN`, builds via `docker/build-push-action`, and computes image tags from the trigger context (`v<package.json.version>-beta.<sha>` + `beta` on main; `<tag>` + `latest` on tags). A final step creates a GitHub Release on tags. The existing `ci.yml` stays validation-only.

**Tech Stack:** GitHub Actions, docker/build-push-action, GHCR.

## Global Constraints

- Branch: `feature/ghcr-publishing` (already checked out). Commit messages: imperative present tense.
- Verification (from `AGENTS.md`): `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. These validate the app, not YAML — for this plan, validate YAML syntax and read the workflow through carefully since Actions runs only on GitHub.
- No new dependencies, no secrets beyond the auto-generated `GITHUB_TOKEN`.
- Existing `ci.yml` (`.github/workflows/ci.yml`) is NOT modified — it remains validation only.
- Version source for betas: `package.json` `version` field (currently `0.0.0`). Stable version comes from the git tag itself.
- Image tags always pushed:
  - main: `v<version>-beta.<sha>` and `beta`
  - tag: `<tag>` and `latest`

---

### Task 1: Add `publish.yml` workflow

**Files:**
- Create: `.github/workflows/publish.yml`

**Interfaces:**
- Consumes: `Dockerfile`, `.dockerignore` (already exist), `package.json` `version`.
- Produces: workflow file `publish.yml`; nothing else in the codebase depends on it.

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/publish.yml`:

```yaml
name: Publish Docker image

on:
  push:
    branches: [main]
    tags: ['v*']

permissions:
  contents: write
  packages: write

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Compute image tags
        id: tags
        run: |
          OWNER_LC=$(echo "${{ github.repository_owner }}" | tr '[:upper:]' '[:lower:]')
          VERSION=$(node -p "require('./package.json').version")
          if [[ "${{ github.ref_type }}" == "tag" ]]; then
            TAG="${{ github.ref_name }}"
            echo "tags=ghcr.io/${OWNER_LC}/tileboard:${TAG},ghcr.io/${OWNER_LC}/tileboard:latest" >> "$GITHUB_OUTPUT"
          else
            SHA="${{ github.sha }}"
            SHORT="${SHA:0:8}"
            echo "tags=ghcr.io/${OWNER_LC}/tileboard:v${VERSION}-beta.${SHORT},ghcr.io/${OWNER_LC}/tileboard:beta" >> "$GITHUB_OUTPUT"
          fi

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.tags.outputs.tags }}

      - name: Create GitHub Release
        if: github.ref_type == 'tag'
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

- [ ] **Step 2: Verify the YAML parses**

Run:
```bash
node -e "const y=require('js-yaml');const fs=require('fs');y.load(fs.readFileSync('.github/workflows/publish.yml','utf8'));console.log('yaml ok')" || npx --yes prettier .github/workflows/publish.yml --check
```

Expected: no parse error. (js-yaml may not be installed — fallback is a prettier check, which validates YAML syntax too.)

- [ ] **Step 3: Read through the file once more**

Confirm each constraint is met:
- `on.push.branches: [main]` and `on.push.tags: ['v*']` both present.
- `permissions` grants `packages: write` and `contents: write` (the latter for `softprops/action-gh-release`).
- Beta path emits `v0.0.0-beta.<sha>` + `beta`; tag path emits `<tag>` + `latest`.
- Release step is gated on `github.ref_type == 'tag'`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish.yml
git commit -m "Add GHCR publishing workflow"
```

---

### Task 2: Verify `ci.yml` is untouched and validate full pipeline

**Files:**
- Verify: `.github/workflows/ci.yml` (unchanged)

**Interfaces:**
- Consumes: the unmodified `ci.yml` from before this change.
- Produces: confirmation that validation and publishing are separate.

- [ ] **Step 1: Confirm ci.yml has no publish step**

Run:
```bash
git diff main -- .github/workflows/ci.yml
```

Expected: no output (no diff for `ci.yml`).

- [ ] **Step 2: Run the app verification suite**

Run:
```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

Expected: all four pass (no app code changed; this guards against regressions before pushing).

- [ ] **Step 3: Commit**

No changes expected. If `git status` is clean, skip the commit.

---

### Task 3: Push branch and open PR

**Files:**
- None.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/ghcr-publishing
```

- [ ] **Step 2: Open the PR to `main`**

```bash
gh pr create --base main --title "Add GHCR publishing workflow" --body "Publishes TileBoard to GHCR on main merges (beta) and on v* tags (stable + release)."
```

Expected: PR URL printed.