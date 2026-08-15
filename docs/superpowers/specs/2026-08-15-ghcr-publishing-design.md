# GHCR Docker Image Publishing — Design

Date: 2026-08-15
Status: Proposed

## Goal

Publish the TileBoard Docker image to GitHub Container Registry (GHCR) whenever
code lands on `main`, using a SemVer-based versioning scheme that marks normal
merges/builds as **betas**, and supports opt-in **stable** releases via git tags.

## Versioning model

- **Betas** — every merge to `main` produces a beta image. Version is read from
  `package.json` (currently `0.0.0`). Users bump `package.json` only when cutting
  a stable release.
- **Stable releases** — opt-in via a git tag `v1.2.3`. No tag push, no stable
  image; nothing auto-promotes a beta to stable.

## Image tags pushed to `ghcr.io/<owner>/tileboard`

| Trigger | Tags pushed |
|---|---|
| Merge to `main` | `v0.0.0-beta.<short-sha>` (from `package.json`), plus moving `beta` |
| Tag `v1.2.3` | `v1.2.3` (tag name), plus `latest` |

The short SHA keeps each beta traceable to a specific commit. The moving `beta`
tag is a convenient pointer for `docker pull` on test/CI machines.

## Workflows

### `.github/workflows/ci.yml` (existing, unchanged behavior)
Validation only — lint, typecheck, test, and a plain `docker build` to prove the
image compiles. Does **not** push.

### `.github/workflows/publish.yml` (new)
Triggers:
- `push: branches: [main]` → beta build
- `push: tags: ['v*']` → stable build

Single job:
1. `actions/checkout@v4`
2. `docker/login-action@v3` to GHCR using `GITHUB_TOKEN`
3. `docker/build-push-action@v6` — build and push, tags computed from context:
   - on `main`: `v<package.json.version>-beta.<short-sha>` + `beta`
   - on `v*` tag: `<tag>` + `latest`
4. On tags only: create a GitHub Release from the tag with auto-generated notes
   (`softprops/action-gh-release@v2`).

## Auth

`GITHUB_TOKEN` (auto-generated). `packages: write` permission is set on the job.
Works with GHCR for both public and private repos with no extra secrets.

## Stable release process (recommended)

1. Bump `version` in `package.json`.
2. Create and merge a `chore/release` branch bumping the version.
3. `git tag v1.2.0` and `git push origin v1.2.0`.
4. Workflow builds, pushes `v1.2.0` + `latest`, and creates a GitHub Release.

## Deliberately out of scope (add when needed)

- Multi-arch builds (`linux/arm64`, etc.)
- Automatic version bumping from commit conventions (semantic-release style)
- Docker Hub publishing
- SBOM / provenance attestation
- Retention / pruning of old beta images

## Open questions

None — scope is fixed to the above.
