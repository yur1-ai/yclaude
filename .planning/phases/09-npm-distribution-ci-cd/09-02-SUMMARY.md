---
phase: 09-npm-distribution-ci-cd
plan: "02"
subsystem: infra
tags: [github-actions, ci-cd, npm-publish, biome, github-release]

requires:
  - phase: 09-npm-distribution-ci-cd
    plan: 01
    provides: package.json publish-ready, biome configured at exit 0, production build pipeline

provides:
  - CI workflow (.github/workflows/ci.yml) — PR quality gate running biome/typecheck/test/build on every push/PR to main
  - Publish workflow (.github/workflows/publish.yml) — tag-triggered npm publish + GitHub Release automation
  - check job in publish workflow validates package contents before publish via npm pack --dry-run
  - Zero-manual-step release process: npm version patch && git push --follow-tags

affects:
  - future release management (v* tag push triggers full publish pipeline)

tech-stack:
  added: []
  patterns:
    - "GitHub Actions: separate check job (safety gate) and publish job with needs: check dependency"
    - "npm auth in CI: registry-url in setup-node writes .npmrc; NODE_AUTH_TOKEN env var consumed by npm publish"
    - "softprops/action-gh-release@v2 with generate_release_notes: true for auto changelog from commits"
    - "npm pack --dry-run in check job validates tarball contents before publish step runs"

key-files:
  created:
    - .github/workflows/ci.yml
    - .github/workflows/publish.yml
  modified: []

key-decisions:
  - "CI uses npm ci (not npm install) — deterministic install from lockfile, faster in CI"
  - "publish job has needs: check — publish NEVER runs if check fails; safety gate prevents broken releases"
  - "registry-url on setup-node in publish job only — required for NODE_AUTH_TOKEN to be written to .npmrc"
  - "permissions: contents: write on publish job — required for softprops/action-gh-release to create GitHub Releases"
  - "check job runs build:prod (full production bundle) before npm pack validation — validates actual publish artifact"
  - "GITHUB_TOKEN implicitly available for action-gh-release — no additional secret needed beyond NPM_TOKEN"

patterns-established:
  - "Workflow separation: ci.yml (every push/PR) vs publish.yml (tag only) — clear responsibility boundaries"
  - "Two-job publish pattern: check (quality gate) then publish (registry + release) with needs dependency"

requirements-completed:
  - DIST-02

duration: 1min
completed: "2026-03-01"
---

# Phase 09 Plan 02: GitHub Actions CI/CD Workflows Summary

**Two-workflow GitHub Actions setup: ci.yml quality gate (push/PR) and publish.yml (v* tags) with check-then-publish job dependency, npm auth via registry-url + NODE_AUTH_TOKEN, and auto GitHub Release creation**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-01T23:00:10Z
- **Completed:** 2026-03-01T23:01:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `ci.yml` created: triggers on push to main and PRs to main; runs biome lint, typecheck, tests, build on ubuntu-latest Node 24
- `publish.yml` created: triggers on v* tags; check job validates quality + package contents; publish job (needs check) publishes to npm and creates GitHub Release
- Complete zero-manual-step release process: `npm version patch && git push --follow-tags` is the entire release workflow

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ci.yml — PR quality gate workflow** - `45379f8` (feat)
2. **Task 2: Create publish.yml — tag-triggered publish + release workflow** - `55f4957` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `.github/workflows/ci.yml` - CI quality gate: checkout, setup-node@v4 Node 24, npm ci, web npm ci, biome ci, typecheck, test, build
- `.github/workflows/publish.yml` - Publish pipeline: check job (all of CI + build:prod + npm pack --dry-run), publish job (needs: check, npm publish with NODE_AUTH_TOKEN, softprops/action-gh-release@v2)

## Decisions Made
- `npm ci` over `npm install` in all CI steps — reads lockfile exactly, deterministic, faster in CI environment
- `registry-url: 'https://registry.npmjs.org'` only on the `publish` job's `setup-node` step — `check` job does not need it (no publish there); registry-url triggers the .npmrc write that activates NODE_AUTH_TOKEN
- `check` job uses `npm run build:prod` (not `npm run build`) so the full production artifact is validated before publish
- `npm pack --dry-run` step validates that `dist/server/cli.js` and `dist/web/index.html` are present in the tarball — catches packaging mistakes before the publish step runs
- `generate_release_notes: true` — GitHub auto-generates changelog from commits since last tag; no manual changelog maintenance needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

Before the first tag push, NPM_TOKEN must be set as a GitHub Actions secret:
1. Generate a granular npm access token at npmjs.com (Settings > Access Tokens > Generate New Token — Granular)
2. Enable "Bypass two-factor authentication" on the token (required since December 2025 classic token revocation)
3. Add token to GitHub repo: Settings > Secrets and variables > Actions > New repository secret, name: `NPM_TOKEN`
4. Verify by pushing a v* tag: `npm version patch && git push --follow-tags`

## Self-Check

- `.github/workflows/ci.yml` exists: YES
- `.github/workflows/publish.yml` exists: YES
- Task 1 commit `45379f8`: verified in git log
- Task 2 commit `55f4957`: verified in git log
- `needs: check` in publish.yml: YES
- `registry-url: 'https://registry.npmjs.org'` in publish.yml: YES
- `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` in publish.yml: YES
- `softprops/action-gh-release@v2` in publish.yml: YES
- `generate_release_notes: true` in publish.yml: YES
- `permissions: contents: write` in publish.yml: YES
- `npm pack --dry-run` in publish.yml check job: YES

## Self-Check: PASSED

## Next Phase Readiness
- CI/CD is fully configured; all future PRs get automatic quality checks
- Release process: `npm version patch && git push --follow-tags` triggers full publish + GitHub Release
- Only remaining step before first publish: add NPM_TOKEN to GitHub Actions secrets (manual one-time setup)
- Phase 9 complete — npm distribution and CI/CD infrastructure fully established

---
*Phase: 09-npm-distribution-ci-cd*
*Completed: 2026-03-01*
