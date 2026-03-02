---
phase: 09-npm-distribution-ci-cd
plan: "04"
subsystem: infra
tags: [npm, publish, oidc, trusted-publishing, ci-cd, github-actions]

requires:
  - phase: 09-npm-distribution-ci-cd
    plan: "01"
    provides: unified dist/ output with bundled deps, publish-ready package.json
  - phase: 09-npm-distribution-ci-cd
    plan: "02"
    provides: publish.yml GitHub Actions workflow with OIDC Trusted Publishing
  - phase: 09-npm-distribution-ci-cd
    plan: "03"
    provides: README.md storefront, LICENSE, package.json license field

provides:
  - yclaude published on npmjs.com (currently 0.1.7)
  - npm Trusted Publishing (OIDC) configured — no NPM_TOKEN secret needed
  - GitHub Actions CI/CD pipeline fully operational and verified
  - provenance attestation on all CI-published releases

affects:
  - future version bumps (bump version + push tag to trigger publish.yml)
  - REQUIREMENTS.md DIST-01

tech-stack:
  added:
    - npm Trusted Publishing (OIDC) — passwordless publish from GitHub Actions
  patterns:
    - "OIDC Trusted Publishing: configure once on npmjs.com, no token storage required"
    - "First publish must be manual (npm publish --otp); subsequent via git tag push"
    - "package.json repository field required for npm provenance verification"
    - "Biome excluded from package.json formatting (npm version rewrites it)"

key-files:
  created: []
  modified:
    - package.json (repository field added for provenance; version bumped to 0.1.7)
    - biome.json (package.json excluded from formatter)
    - src/server/routes/summary.ts (optional token fields guarded with nullish coalescing)
    - src/server/routes/summary.test.ts (assertion updated for mainCostUsd/subagentCostUsd)

key-decisions:
  - "OIDC Trusted Publishing used instead of NPM_TOKEN — more secure, no secret rotation"
  - "First publish done manually with --otp due to npm 2FA enforcement on new packages"
  - "package.json repository field is required by npm for provenance attestation (missing field caused 0.1.6 publish failure)"
  - "Biome excluded from formatting package.json because npm version command rewrites it and Biome reformats it back, causing CI lint failures"

requirements-completed: [DIST-01]

duration: human-checkpoint (multi-session)
completed: "2026-03-01"
---

# Phase 09 Plan 04: First npm Publish Summary

**yclaude 0.1.7 live on npmjs.com via GitHub Actions OIDC Trusted Publishing with provenance attestation — no NPM_TOKEN secret required**

## Performance

- **Duration:** Human checkpoint (manual multi-step process across multiple CI iterations)
- **Started:** 2026-03-01 (checkpoint opened)
- **Completed:** 2026-03-01
- **Tasks:** 2 (Task 1: automated readiness verification; Task 2: human checkpoint)
- **Files modified:** 4

## Accomplishments

- `yclaude` name confirmed available on npmjs.com and claimed
- npm Trusted Publishing (OIDC) configured for `yur1-ai/yclaude` repo, `publish.yml` workflow — no `NPM_TOKEN` secret needed
- First publish done manually: `yclaude@0.1.0` with `--otp` (npm 2FA required on new packages)
- GitHub Actions publish pipeline verified end-to-end: `yclaude@0.1.7` published with provenance attestation
- Several CI issues discovered and fixed during hotfix iterations (0.1.1 through 0.1.7)

## Task Commits

Human checkpoint — no per-task commits from Claude. All commits were made during CI iteration:

1. `645e2ad` — chore: bump to 0.1.1 — fix README broken screenshot links
2. `f489d6a` — fix(biome): format package.json files array to single line
3. `05541fc` — chore: bump to 0.1.2
4. `cb9a917` — fix(biome): exclude package.json from formatting (npm version rewrites it)
5. `a2ea9d4` — chore: bump to 0.1.3
6. `fd51384` — fix(types): guard optional token fields and timestamp with nullish coalescing
7. `09be480` — chore: bump to 0.1.4
8. `f74c754` — fix(tests): update summary assertion to include mainCostUsd and subagentCostUsd fields
9. `ac5b4bd` — chore: bump to 0.1.5
10. `867c912` — fix(package): add repository field for npm provenance verification
11. `51d5b73` — chore: bump to 0.1.6
12. `90f70c7` — chore: bump to 0.1.7

## Files Created/Modified

- `package.json` — `repository` field added (required for provenance); `version` at 0.1.7; `files` array single-line reformatted
- `biome.json` — `package.json` added to formatter ignore list (npm version rewrites it, causing Biome re-format CI failures)
- `src/server/routes/summary.ts` — optional token fields guarded with nullish coalescing operators
- `src/server/routes/summary.test.ts` — test assertion updated to include `mainCostUsd` and `subagentCostUsd` fields

## Decisions Made

- **OIDC Trusted Publishing over NPM_TOKEN:** Configured npm Trusted Publishing scoped to `yur1-ai/yclaude`, `publish.yml` workflow. More secure than token-based auth — no secret to rotate, no credential exposure risk.
- **Manual first publish:** npm enforces 2FA on the first publish of a new package. Used `npm publish --otp <code>` locally for 0.1.0. All subsequent publishes handled by GitHub Actions via OIDC.
- **repository field required for provenance:** npm provenance attestation requires `repository` field in package.json. Without it, publish succeeds but provenance verification fails (discovered at 0.1.6, fixed at 0.1.7).
- **Biome excluded from package.json formatting:** `npm version` rewrites `package.json` with its own formatting (trailing newline, specific indentation). Biome then reformats it differently, causing CI lint to fail on the version bump commit. Solution: exclude `package.json` from Biome formatter in `biome.json`.

## Deviations from Plan

The original plan called for a granular NPM_TOKEN created on npmjs.com and stored in GitHub secrets. This was replaced with OIDC Trusted Publishing before the checkpoint was issued (handled in plan 09-02, commit `98b11d5`). The checkpoint instructions were updated accordingly.

The original target version was 0.1.0. Due to CI debugging iterations, the current live version is 0.1.7. All intermediate versions (0.1.1–0.1.6) fixed real issues discovered during CI runs.

**Total deviations:** 1 architectural (OIDC over NPM_TOKEN — pre-planned by 09-02), plus 4 CI bug fixes handled during hotfix iterations.

**Impact on plan:** All fixes necessary for a working, secure CI/CD pipeline. The OIDC approach is strictly better than the original NPM_TOKEN approach. No scope creep.

## Issues Encountered

1. **Biome CI failure on version bump:** `npm version` rewrites `package.json`; Biome then reformats it, causing the pre-commit Biome check to pass locally but CI lint to fail. Fixed by excluding `package.json` from Biome formatter.
2. **TypeScript errors in summary route:** Optional token fields accessed without null guards. Fixed with nullish coalescing.
3. **Test assertion mismatch:** Test checked for specific fields that didn't match the updated API shape. Fixed assertion.
4. **npm provenance failure:** `package.json` missing `repository` field. npm requires this for provenance attestation. Added field, republished as 0.1.7.

## User Setup Required

None going forward — OIDC Trusted Publishing is configured. To publish a new version:

```bash
npm version patch   # or minor / major
git push --follow-tags
```

GitHub Actions will handle publish automatically.

## Next Phase Readiness

- Phase 9 complete — all plans (09-01 through 09-04) done
- `yclaude` is live on npmjs.com and installable via `npx yclaude`
- CI/CD pipeline operational — future releases automated via git tag push
- DIST-01 requirement completed
- Pending: Phase 9.1 (deferred) — cost accuracy for Pro/Max users

---
*Phase: 09-npm-distribution-ci-cd*
*Completed: 2026-03-01*
