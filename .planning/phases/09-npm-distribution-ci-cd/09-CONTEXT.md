# Phase 9: npm Distribution & CI/CD - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish `yclaude` to npm as a working CLI package (`npx yclaude`), write a polished README, and set up GitHub Actions for automated publish on tag push. This phase ships the product. A future hosted web version is a separate product — not a package split.

</domain>

<decisions>
## Implementation Decisions

### Package layout
- Move Vite build output from `web-dist/` → `dist/web/` (change `outDir` in `vite.config.ts` to `'../dist/web'`)
- Update `src/server/server.ts` path from `../../web-dist` → `../web`
- `package.json` `files` field: `["dist"]` only — whitelist approach, no `.npmignore` needed
- Everything lives under one `dist/` directory; `web-dist/` is retired
- `yclaude` will always be a single unified package — no `@yclaude/web` split planned

### Build pipeline
- Add `build:prod` script: tsup with `sourcemap: false` + Vite frontend build
- Wire `"prepublishOnly": "npm run build:prod"` — impossible to accidentally publish stale artifacts
- Development `build` script keeps `sourcemap: true` (unchanged)
- All runtime dependencies (hono, @hono/node-server, commander, open, zod) bundled into the CLI output via tsup — self-contained, no transitive deps for `npx` users

### Source maps
- Stripped from npm publish (`build:prod` uses `sourcemap: false`)
- Dev builds keep source maps (existing `build` script unchanged)

### Node version
- Bump `engines.node` to `>=24.0.0` (current Active LTS as of Oct 2025; target audience runs modern Node)

### Package validation
- CI runs `npm pack --dry-run` after build to verify expected files are present before publish step
- No `.npmignore` — `files: ["dist"]` whitelist is sufficient

### CLI version string
- Remove hardcoded `'0.1.0'` from `cli.ts`
- Read version dynamically: `createRequire(import.meta.url)('../../package.json').version`
- `yclaude --version` always reflects the published version automatically

### README structure
- Goal: install quickly + detailed feature overview
- Structure: one-liner value prop near the top → install command → feature tour → detailed sections
- Four badges at top: npm version, CI status, Node version, License
- Hero screenshot: Overview dashboard (most impressive single view)
- Feature tour: one-liner description per feature paired with a screenshot — scannable, visuals carry the weight
- Pages to cover: Overview, Cost chart, Model breakdown, Session explorer, Session detail, Activity heatmap, Dark mode

### CI/CD: two-workflow design
- `ci.yml` — triggers on PR push to main; runs: Biome lint, typecheck, tests, build
- `publish.yml` — triggers on `v*` tag push; jobs: `check` (same as ci.yml) → `publish` (needs: check); then creates GitHub Release with auto-generated release notes

### Linter
- Add Biome: single tool for lint + format, zero config to start, fast
- Add `biome check` script to package.json
- CI runs `biome check --no-fix` (read-only, fails on violations)

### CI matrix
- OS: ubuntu-latest only (macOS runners are 10x cost; no OS-specific paths in codebase)
- Node: 24 only (matches engines requirement)

### npm auth
- NPM_TOKEN stored as GitHub repo secret (Settings > Secrets > Actions)
- Use an npm Automation token (bypasses 2FA for CI automation)
- `publish.yml` uses `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`

### GitHub Release
- Created automatically by `publish.yml` after successful npm publish
- Use `softprops/action-gh-release` or `gh release create`; auto-generate release notes from commits since last tag

### Version & release process
- Version bumps: `npm version patch/minor/major` locally — auto-commits updated `package.json` and creates git tag
- Push with `git push --follow-tags` — CI picks up the tag and publishes
- No `CHANGELOG.md` — GitHub Releases auto-generated notes are the changelog
- First published version: `0.1.0`

### Claude's Discretion
- Exact Biome config rules (start from recommended, adjust as needed)
- GitHub Release action choice (softprops/action-gh-release vs gh CLI)
- Exact README prose and screenshot captions
- `npm version` commit message format
- Whether to add `release` script to package.json as a convenience alias

</decisions>

<specifics>
## Specific Ideas

- `npx yclaude` must work cold — that's the primary install path; bundling deps is essential for this
- The README is the product's storefront on npmjs.com — it needs to do real selling, not just document
- Future hosted web deployment is a separate product (different auth, storage, infrastructure) — not derived from this CLI package

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `tsup.config.ts`: already configured for ESM backend build; needs `sourcemap: false` variant and `noExternal`/bundle option for prod
- `web/vite.config.ts`: `outDir` needs to change from `'../web-dist'` to `'../dist/web'`
- `src/server/server.ts:14`: `fileURLToPath(new URL('../../web-dist', import.meta.url))` → change to `'../web'`
- `src/server/cli.ts`: version hardcoded as `'0.1.0'` on line ~12 — replace with dynamic read
- `package.json`: `bin`, `main`, `exports` already correct; needs `files`, `prepublishOnly`, `build:prod`, `biome` scripts

### Established Patterns
- `npm` is the package manager in use (not bun) — keep for consistency
- `tsup` already handles backend build; just needs prod variant (no sourcemaps, bundled deps)
- `.gitignore` already includes `dist/` and `web-dist/` — `dist/web/` is automatically gitignored

### Integration Points
- `src/server/server.ts:14` — single place where web asset path is resolved; update path here
- `src/server/cli.ts` — version string and bin entrypoint; update version read here
- `package.json` — `files`, `engines`, `scripts`, `prepublishOnly` all need additions
- `.github/workflows/` — directory does not exist yet; create `ci.yml` and `publish.yml`

</code_context>

<deferred>
## Deferred Ideas

- npm provenance (OIDC attestation, `--provenance` flag) — can upgrade the auth approach in a later release without blocking initial publish
- Windows CI matrix — not needed for current audience but could be added later
- Automated CHANGELOG generation (changesets, semantic-release) — manual `npm version` is sufficient for now
- Phase 9.1: Cost accuracy for Pro/Max users — full spec already in ROADMAP.md

</deferred>

---

*Phase: 09-npm-distribution-ci-cd*
*Context gathered: 2026-03-01*
