---
phase: 09-npm-distribution-ci-cd
plan: "03"
subsystem: docs
tags: [readme, npm-storefront, license, badges, documentation]

requires:
  - phase: 09-npm-distribution-ci-cd
    plan: "01"
    provides: publish-ready package.json with correct fields

provides:
  - README.md: npm storefront with badges, install guide, full feature tour
  - LICENSE: MIT license file
  - package.json: "license": "MIT" field added

affects:
  - npmjs.com package page (README renders as storefront)
  - GitHub repository landing page

tech-stack:
  added: []
  patterns:
    - "shields.io badge URLs reference npmjs.com package and GitHub Actions workflow"
    - "Screenshot placeholders use HTML comment + img tag pattern for future screenshot addition"

key-files:
  created:
    - README.md
    - LICENSE
  modified:
    - package.json

key-decisions:
  - "GitHub repo URL resolved from SSH remote alias git@github.com-yur1ai:yur1-ai/yclaude.git -> https://github.com/yur1-ai/yclaude"
  - "Hero screenshot re-uses overview.png (most impressive single view per CONTEXT.md)"
  - "Seven feature sections with screenshot placeholders - images won't render until docs/screenshots/ populated"
  - "personality touch: opening one-liner is a dry quip before any technical content"

duration: 2min
completed: "2026-03-01"
---

# Phase 09 Plan 03: README Product Storefront Summary

**Polished README.md for npmjs.com with four badges, install guide, seven-feature tour with screenshot placeholders, and MIT license**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T23:00:23Z
- **Completed:** 2026-03-01T23:02:00Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments

- `README.md` created at project root: title + dry one-liner value prop, four badges (npm version, CI status, Node >=24, License MIT), hero screenshot placeholder
- Feature tour covers all 7 areas from CONTEXT.md in order: Overview, Cost Over Time, Model Breakdown, Session Explorer, Session Detail, Activity Heatmap, Dark Mode — each with a 2-3 sentence description and screenshot placeholder
- CLI options section documents all flags: `-d/--dir`, `-p/--port`, `--no-open`, `--debug`, `-v/--version`, `-h/--help`
- "How it works" section: reads `~/.claude/projects/**/*.jsonl`, no network calls, bound to 127.0.0.1 only
- `LICENSE` created with standard MIT text (2026, Yuri Shevtsov)
- `package.json` updated with `"license": "MIT"` field

## Task Commits

1. **Task 1: Write README.md — product storefront** — `5e28594` (feat)
   - README.md (created), LICENSE (created), package.json (license field)

## Files Created/Modified

- `README.md` — Full product storefront: badges, install, feature tour (7 sections), CLI options, how it works, requirements, license
- `LICENSE` — MIT license (2026, Yuri Shevtsov)
- `package.json` — Added `"license": "MIT"` field

## Decisions Made

- **GitHub repo URL from SSH alias:** The git remote uses a custom SSH alias (`git@github.com-yur1ai:yur1-ai/yclaude.git`). The actual HTTPS URL for badges is `https://github.com/yur1-ai/yclaude` — converted from SSH format as instructed.
- **Screenshot placeholders in place:** `docs/screenshots/` directory doesn't exist yet. Placeholders use `<!-- screenshot: [name] -->` HTML comment + `![...](docs/screenshots/[slug].png)` pattern. Images won't render until screenshots are captured, but the structure is in place for future addition.
- **Dry humor one-liner:** "Find out why Claude keeps spending your tokens on that one recursive function." — developer-focused, brand-aligned, lands before any technical content.

## Deviations from Plan

None — plan executed exactly as written. README structure, badge URLs, feature order, and CLI options all match CONTEXT.md spec exactly.

## Self-Check: PASSED

- `README.md` exists at `/Users/ishevtsov/ai-projects/yclaude/README.md` — confirmed
- `LICENSE` exists at `/Users/ishevtsov/ai-projects/yclaude/LICENSE` — confirmed
- `package.json` has `"license": "MIT"` — confirmed
- Task commit `5e28594` verified in git log
- All 4 badge URLs present, `npx yclaude` install command present, all 7 feature sections present

## Next Phase Readiness

- README is ready for npm publish — will render correctly on npmjs.com once package is published
- CI badge will activate once `.github/workflows/ci.yml` exists (created in plan 09-02)
- Screenshot placeholders signal where `docs/screenshots/` content should go in a future pass
- `package.json` is complete: name, version, description, license, engines, files, bin, prepublishOnly all set
