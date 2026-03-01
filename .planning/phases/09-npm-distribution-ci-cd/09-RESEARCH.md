# Phase 9: npm Distribution & CI/CD - Research

**Researched:** 2026-03-01
**Domain:** npm packaging, tsup bundling, GitHub Actions CI/CD, Biome linting
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Package layout**
- Move Vite build output from `web-dist/` to `dist/web/` (change `outDir` in `vite.config.ts` to `'../dist/web'`)
- Update `src/server/server.ts` path from `../../web-dist` to `../web`
- `package.json` `files` field: `["dist"]` only — whitelist approach, no `.npmignore` needed
- Everything lives under one `dist/` directory; `web-dist/` is retired
- `yclaude` will always be a single unified package — no `@yclaude/web` split planned

**Build pipeline**
- Add `build:prod` script: tsup with `sourcemap: false` + Vite frontend build
- Wire `"prepublishOnly": "npm run build:prod"` — impossible to accidentally publish stale artifacts
- Development `build` script keeps `sourcemap: true` (unchanged)
- All runtime dependencies bundled into the CLI output via tsup `noExternal` — self-contained for `npx` users

**Source maps**
- Stripped from npm publish (`build:prod` uses `sourcemap: false`)
- Dev builds keep source maps (existing `build` script unchanged)

**Node version**
- Bump `engines.node` to `>=24.0.0`

**Package validation**
- CI runs `npm pack --dry-run` after build to verify expected files are present before publish step
- No `.npmignore` — `files: ["dist"]` whitelist is sufficient

**CLI version string**
- Remove hardcoded `'0.1.0'` from `cli.ts`
- Read version dynamically: `createRequire(import.meta.url)('../../package.json').version`
- `yclaude --version` always reflects the published version automatically

**README structure**
- Four badges at top: npm version, CI status, Node version, License
- Hero screenshot: Overview dashboard
- Feature tour: one-liner description per feature paired with a screenshot
- Pages to cover: Overview, Cost chart, Model breakdown, Session explorer, Session detail, Activity heatmap, Dark mode

**CI/CD: two-workflow design**
- `ci.yml` — triggers on PR push to main; runs: Biome lint, typecheck, tests, build
- `publish.yml` — triggers on `v*` tag push; jobs: `check` (same as ci.yml) then `publish` (needs: check); then creates GitHub Release with auto-generated release notes

**Linter**
- Add Biome: single tool for lint + format, zero config to start, fast
- Add `biome check` script to package.json
- CI runs `biome ci` (read-only, fails on violations)

**CI matrix**
- OS: ubuntu-latest only
- Node: 24 only (matches engines requirement)

**npm auth**
- NPM_TOKEN stored as GitHub repo secret
- Use a granular token with "Bypass 2FA" enabled for CI automation
- `publish.yml` uses `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`

**GitHub Release**
- Created automatically by `publish.yml` after successful npm publish
- Use `softprops/action-gh-release@v2` with `generate_release_notes: true`

**Version & release process**
- Version bumps: `npm version patch/minor/major` locally — auto-commits updated `package.json` and creates git tag
- Push with `git push --follow-tags` — CI picks up the tag and publishes
- No `CHANGELOG.md` — GitHub Releases auto-generated notes are the changelog
- First published version: `0.1.0`

### Claude's Discretion

- Exact Biome config rules (start from recommended, adjust as needed)
- GitHub Release action choice (softprops/action-gh-release vs gh CLI) — use `softprops/action-gh-release@v2`
- Exact README prose and screenshot captions
- `npm version` commit message format
- Whether to add `release` script to package.json as a convenience alias

### Deferred Ideas (OUT OF SCOPE)

- npm provenance (OIDC attestation, `--provenance` flag)
- Windows CI matrix
- Automated CHANGELOG generation (changesets, semantic-release)
- Phase 9.1: Cost accuracy for Pro/Max users
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-01 | User can publish yclaude to npm manually: pre-built web assets bundled, no source maps, correct `main`/`bin`/`files` fields, polished README with install instructions and feature screenshots | tsup `noExternal: [/.*/]` bundles all deps; `files: ["dist"]` whitelist; `prepublishOnly` guard; `npm pack --dry-run` validation; `vite.config.ts outDir` migration |
| DIST-02 | Developer can push a git tag and have GitHub Actions automatically run lint, typecheck, tests, build, and `npm publish` — no manual publish steps required | Two-workflow design (ci.yml + publish.yml); `setup-node` with `registry-url`; `NODE_AUTH_TOKEN` from granular npm token; `softprops/action-gh-release@v2` for GitHub Release |
</phase_requirements>

---

## Summary

Phase 9 ships yclaude to npm and automates all future releases. The work divides into four areas: (1) reorganizing the build output under a unified `dist/` directory, (2) adding a production tsup config that bundles all runtime dependencies so `npx yclaude` works cold, (3) writing the polished README that serves as the product's storefront on npmjs.com, and (4) creating two GitHub Actions workflows that enforce quality on every PR and publish automatically on version tag push.

The most important technical insight for this phase is tsup's `noExternal: [/.*/]` option. By default, tsup externalizes everything in `dependencies` (correct behavior for libraries), but a CLI distributed via `npx` must be self-contained — users are not expected to have `node_modules` present. Using `noExternal: [/.*/]` forces all runtime deps (hono, @hono/node-server, commander, open, zod) into the final bundle. This is safe because the package does not expose a library API.

The npm ecosystem changed significantly in late 2025: classic long-lived tokens were revoked in December 2025. The modern approach is either granular tokens (with "Bypass 2FA" enabled, 90-day max) or full OIDC trusted publishing (no tokens needed). CONTEXT.md has locked in the granular token approach (`NPM_TOKEN` secret) for the initial release; OIDC is explicitly deferred. This is a sound first-release choice.

**Primary recommendation:** Execute sequentially — package restructure first, then prod build config, then CI workflows, then README. Each step is independently testable before moving to the next.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | ^8.5.1 (already installed) | TypeScript/ESM bundler for backend | Already in use; supports `noExternal` for self-contained CLI bundles |
| @biomejs/biome | latest (^1.9.x or ^2.x) | Lint + format in one tool | Single binary, zero config to start, 50-100x faster than ESLint+Prettier |
| softprops/action-gh-release | v2 (v2.5.0 as of Dec 2025) | GitHub Release creation | Most widely used GHA release action; supports `generate_release_notes` |
| actions/setup-node | v4 | Node.js + npm auth setup | Official GitHub action; `registry-url` param creates `.npmrc` automatically |
| actions/checkout | v4 | Repo checkout in CI | Official GitHub action |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| npm pack (built-in) | comes with npm | Validate package contents pre-publish | Run `--dry-run` in CI before publish step |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| granular NPM_TOKEN | OIDC trusted publishing | OIDC is safer (no stored secret) but requires npm package settings configuration step; deferred |
| softprops/action-gh-release | `gh release create` | gh CLI works too but requires more manual YAML; softprops is more concise |
| `biome ci` | `biome check --no-fix` | `biome check --no-fix` is not a documented flag; `biome ci` is the correct read-only CI command |

**Installation:**
```bash
npm install --save-dev --save-exact @biomejs/biome
```

---

## Architecture Patterns

### Recommended Project Structure After Phase 9

```
dist/
├── index.js          # Library entrypoint (tsup output)
├── index.d.ts        # Type declarations
├── server/
│   └── cli.js        # CLI entrypoint (tsup output, no source maps)
└── web/              # Vite build output (moved from web-dist/)
    ├── index.html
    └── assets/
.github/
└── workflows/
    ├── ci.yml        # PR checks
    └── publish.yml   # Tag-triggered publish + release
biome.json            # Linter/formatter config
```

### Pattern 1: tsup Dual Config (dev vs prod)

**What:** Export an array of configs from `defineConfig`. tsup runs both sequentially in one `tsup` invocation.

**When to use:** When you need identical entry points but different output options (sourcemaps on/off, bundling behavior).

```typescript
// tsup.config.ts — AFTER Phase 9 changes
import { defineConfig } from 'tsup';

const shared = {
  entry: ['src/index.ts', 'src/server/cli.ts'],
  format: ['esm'] as const,
  target: 'node24',
  clean: true,
  dts: { entry: ['src/index.ts'] },
};

export default defineConfig([
  // Dev build (default: npm run build:backend)
  {
    ...shared,
    sourcemap: true,
  },
  // Prod build (npm run build:prod)
  // Triggered when BUILD_PROD env var is set
]);
```

**Alternative (simpler): separate tsup config file for prod**

```typescript
// tsup.config.prod.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/cli.ts'],
  format: ['esm'],
  target: 'node24',
  clean: true,
  dts: { entry: ['src/index.ts'] },
  sourcemap: false,
  noExternal: [/.*/],  // Bundle ALL runtime deps — required for npx cold install
});
```

Then in package.json:
```json
"build:backend:prod": "tsup --config tsup.config.prod.ts",
"build:prod": "npm run build:backend:prod && cd web && npm run build:frontend:prod",
```

**Recommended approach:** Use a separate `tsup.config.prod.ts` file. Avoids complexity of conditional logic in the shared config, and the intent is immediately clear.

### Pattern 2: Vite outDir Migration

**What:** Change `outDir` in `vite.config.ts` from `'../web-dist'` to `'../dist/web'`.

**When to use:** This is a one-line change, but must be paired with updating `server.ts` path.

```typescript
// web/vite.config.ts — change one line
build: {
  outDir: '../dist/web',   // was '../web-dist'
  emptyOutDir: true,
},
```

```typescript
// src/server/server.ts — change one line (line 14)
const webDistPath = fileURLToPath(new URL('../../dist/web', import.meta.url));
//                                                    ^^^^ was 'web-dist'
// dist/server/server.js → two up → project root → dist/web (correct relative path)
```

**Critical:** The path `'../../dist/web'` is correct because `server.ts` compiles to `dist/server/server.js`. Two levels up (`../../`) reaches the project root, then `dist/web/`.

### Pattern 3: Dynamic Version Read in ESM CLI

**What:** Read `package.json` version at runtime using `createRequire` (synchronous, works in ESM).

```typescript
// src/server/cli.ts — replace hardcoded '0.1.0'
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };

program
  .name('yclaude')
  .version(version, '-v, --version')
  // ...

// Also update startup log:
console.log(`yclaude v${version}`);
```

**Note:** When tsup bundles with `noExternal: [/.*/]`, the `require('../../package.json')` path resolves relative to `dist/server/cli.js` at runtime. Two levels up reaches the npm package root where `package.json` lives. This is correct.

**Alternative for bundled output:** tsup can inline JSON imports directly. Import via `import pkg from '../../package.json' assert { type: 'json' }`. However, `createRequire` is more explicit and works across all Node.js 18+ versions without experimental flags.

### Pattern 4: GitHub Actions Two-Workflow Design

**ci.yml** — runs on every push to branches (PRs):

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'
      - run: npm ci
      - run: npx @biomejs/biome ci .
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

**publish.yml** — runs on `v*` tag push:

```yaml
name: Publish
on:
  push:
    tags:
      - 'v*'

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: 'npm'
      - run: npm ci
      - run: npx @biomejs/biome ci .
      - run: npm run typecheck
      - run: npm test
      - run: npm run build:prod
      - run: npm pack --dry-run

  publish:
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'
      - run: npm ci
      - run: npm run build:prod
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**Critical detail:** `registry-url: 'https://registry.npmjs.org'` in `setup-node` is REQUIRED. It configures `.npmrc` on the runner with `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}`. Without it, `NODE_AUTH_TOKEN` is ignored and publish fails with auth error.

### Pattern 5: Biome Configuration

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.11/schema.json",
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all"
    }
  },
  "files": {
    "ignore": ["dist", "web-dist", "web/dist", "node_modules", "web/node_modules"]
  }
}
```

**Claude's discretion note:** Start with `recommended: true`. Biome's recommended rules are conservative — unlikely to generate excessive noise on existing codebase. Adjust specific rules if they conflict with established project patterns.

### Anti-Patterns to Avoid

- **`.npmignore` instead of `files`:** Using `.npmignore` requires you to track and update it as new files are added. The `files` whitelist is safer — nothing is published unless explicitly included.
- **Hardcoding version in CLI source:** Creates drift between package.json and displayed version. Dynamic read via `createRequire` is the correct pattern.
- **Missing `registry-url` in `setup-node`:** The publish step will fail silently (auth error) without this. It's required even when `NODE_AUTH_TOKEN` is set.
- **`biome check --no-fix` in CI:** This is not a documented Biome flag. Use `biome ci` — it is the official read-only CI command.
- **Building in the `publish` job without the `check` job passing:** The `needs: check` constraint prevents publishing broken code. Never bypass it.
- **Vite sourcemaps in prod:** Vite includes sourcemaps by default. For the prod frontend build, either pass `--sourcemap false` or add `build.sourcemap: false` to `vite.config.ts` for the prod variant.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| npm auth in CI | Custom .npmrc writing | `setup-node` with `registry-url` | setup-node manages .npmrc and token injection correctly; hand-rolling gets `//registry.npmjs.org/:_authToken` syntax wrong |
| Package file validation | Custom file-listing scripts | `npm pack --dry-run` | Built-in, authoritative, shows exact tarball contents |
| GitHub Release creation | `gh release create` with manual notes | `softprops/action-gh-release@v2` with `generate_release_notes: true` | GitHub's API auto-generates notes from commits since last tag |
| Dependency bundling for npx | Manual webpack/rollup config | tsup `noExternal: [/.*/]` | tsup handles ESM tree-shaking, externals, and target correctly |

**Key insight:** The npm publish ecosystem has robust official tooling for every step. The main work is wiring them together correctly, not building custom solutions.

---

## Common Pitfalls

### Pitfall 1: `web-dist/` Still Referenced After Migration

**What goes wrong:** `server.ts` still points to `../../web-dist` after changing `vite.config.ts outDir`. The server starts but serves 404 for all assets. Hard to diagnose because the server starts successfully.

**Why it happens:** Two files must change atomically: `vite.config.ts` (outDir) and `server.ts` (webDistPath). Changing only one breaks the running app.

**How to avoid:** Treat these as a single atomic change. Test with `npm run build` (not just `build:frontend`) and verify the server serves HTML at `http://127.0.0.1:3000`.

**Warning signs:** `npm run build` succeeds but `dist/web/` is empty or missing; `http://127.0.0.1:3000` returns 404.

### Pitfall 2: `npx yclaude` Fails with MODULE_NOT_FOUND

**What goes wrong:** `npx yclaude` on a clean system fails because runtime deps (hono, commander, etc.) are not in node_modules.

**Why it happens:** tsup externalizes `dependencies` by default. Without `noExternal: [/.*/]`, the published tarball contains only the compiled JS files but expects deps to be installed separately.

**How to avoid:** Use `noExternal: [/.*/]` in the prod tsup config. Verify with `npm pack --dry-run` — the tarball should be ~5MB+ if dependencies are bundled, not ~50KB.

**Warning signs:** `npm pack --dry-run` shows only a few small JS files and no vendor code; tarball size < 200KB.

### Pitfall 3: `dist/` is Gitignored but Must Be Published

**What goes wrong:** `.gitignore` includes `dist/`. npm respects `.gitignore` when building the tarball UNLESS a `files` field is present in package.json.

**Why it happens:** When `files: ["dist"]` is set in package.json, npm ignores `.gitignore` for that whitelist. The `files` field takes precedence.

**How to avoid:** Use `files: ["dist"]` whitelist. Run `npm pack --dry-run` to confirm `dist/` contents appear in the tarball. (This is already the correct approach per CONTEXT.md — documenting for verification clarity.)

**Warning signs:** `npm pack --dry-run` shows an empty or near-empty tarball.

### Pitfall 4: Vite Source Maps Published Accidentally

**What goes wrong:** The prod Vite build includes `.js.map` files in `dist/web/assets/`, which are included in the npm tarball since `files: ["dist"]` includes everything under dist.

**Why it happens:** Vite generates sourcemaps by default. The backend tsup prod config has `sourcemap: false`, but the frontend needs its own explicit setting.

**How to avoid:** In `build:frontend:prod`, ensure sourcemaps are disabled. Either add `build: { sourcemap: false }` to `vite.config.ts` for the prod build, or pass it as a build option. Since the project uses a single `vite.config.ts`, the cleanest approach is to add `sourcemap: false` to the `build` block directly (sourcemaps are a dev concern and the dev server uses hot reload, not build output).

**Warning signs:** `npm pack --dry-run` shows `.js.map` files in the assets listing.

### Pitfall 5: Classic npm Tokens Are Revoked (December 2025)

**What goes wrong:** Generating a classic "Automation" token from npmjs.com no longer works — all classic tokens were revoked on December 9, 2025.

**Why it happens:** npm security update in late 2025 eliminated long-lived classic tokens entirely.

**How to avoid:** Create a **granular access token** at npmjs.com/settings/~/tokens with:
- Scope: Packages and repositories (select `yclaude` package specifically)
- Permissions: Read and write
- "Bypass two-factor authentication" checked (required for CI)
- Expiration: up to 90 days (max for write tokens)

Store as `NPM_TOKEN` in GitHub repo Settings > Secrets > Actions.

**Warning signs:** Token generation page on npmjs.com only shows "Granular Access Token" as an option (this is correct — classic token creation is disabled).

### Pitfall 6: `setup-node` Without `registry-url` Breaks Publish Auth

**What goes wrong:** `npm publish` fails with "This operation requires a one-time password from your authenticator" or authentication error, even though `NODE_AUTH_TOKEN` is set.

**Why it happens:** `setup-node` only configures `.npmrc` with registry auth when `registry-url` is provided. Without it, `NODE_AUTH_TOKEN` is set as an env var but never written to the `.npmrc` that npm reads.

**How to avoid:** Always include `registry-url: 'https://registry.npmjs.org'` in the `setup-node` step in the `publish` job.

---

## Code Examples

### tsup Production Config (tsup.config.prod.ts)

```typescript
// Source: tsup docs (jsDocs.io/package/tsup), verified options
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/server/cli.ts'],
  format: ['esm'],
  target: 'node24',
  clean: true,
  dts: { entry: ['src/index.ts'] },
  sourcemap: false,           // No source maps in published package
  noExternal: [/.*/],        // Bundle ALL runtime deps for self-contained npx execution
});
```

### package.json Fields to Add/Change

```json
{
  "files": ["dist"],
  "engines": { "node": ">=24.0.0" },
  "scripts": {
    "build:prod": "tsup --config tsup.config.prod.ts && cd web && npm run build:prod",
    "biome:check": "npx @biomejs/biome check .",
    "prepublishOnly": "npm run build:prod"
  }
}
```

### Dynamic Version Read (ESM + createRequire)

```typescript
// Source: Node.js docs — createRequire is the standard ESM→JSON bridge
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as { version: string };
```

### npm pack Validation in CI

```yaml
# Verifies tarball contents without publishing — fast feedback
- name: Validate package
  run: |
    npm pack --dry-run 2>&1 | tee pack-output.txt
    # Verify dist/server/cli.js is present
    grep -q "dist/server/cli.js" pack-output.txt || (echo "ERROR: cli.js missing from package" && exit 1)
    # Verify dist/web/index.html is present
    grep -q "dist/web/index.html" pack-output.txt || (echo "ERROR: web assets missing from package" && exit 1)
```

### softprops/action-gh-release@v2 Minimal Usage

```yaml
# Source: github.com/softprops/action-gh-release — v2 recommended (Dec 2025)
- uses: softprops/action-gh-release@v2
  with:
    generate_release_notes: true
  # GITHUB_TOKEN is available automatically — no secret needed for release creation
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Classic npm automation tokens | Granular access tokens with Bypass 2FA | December 2025 | Must create granular token instead; classic tokens no longer exist |
| `biome check --no-fix` | `biome ci` | Biome documentation standard | `biome ci` is the correct read-only CI command; `--no-fix` is not a real flag |
| `softprops/action-gh-release@v1` | `softprops/action-gh-release@v2` | v2.5.0 released December 2025 | Use v2 — v1 is still functional but v2 is current |
| `actions/setup-node@v3` | `actions/setup-node@v4` | 2024 | v4 supports caching with `cache: 'npm'` cleanly |
| npm OIDC trusted publishing | Generally available July 2025 | July 2025 | Eliminates token management entirely (deferred for Phase 9) |

**Deprecated/outdated:**
- Classic npm tokens: revoked December 9, 2025 — granular tokens only
- `npm install` in CI: use `npm ci` (reads `package-lock.json`, deterministic, faster)

---

## Open Questions

1. **Vite prod sourcemaps — config vs CLI flag**
   - What we know: Vite has `build.sourcemap` config option and it defaults to `false` in production builds
   - What's unclear: Does the current `vite.config.ts` explicitly set `build.sourcemap`? (Inspection shows it does not — Vite defaults to false in prod, so this may be a non-issue)
   - Recommendation: Verify by running `vite build` and checking if `.map` files appear in output. If not, no change needed to vite config for sourcemaps.

2. **`yclaude` npm name availability**
   - What we know: STATE.md flags this as an open blocker for Phase 9
   - What's unclear: Whether the name is taken (cannot verify without npm registry access)
   - Recommendation: Run `npm view yclaude` before starting publish work. If taken, name decision needs to be resolved before any publish steps.

3. **Biome compatibility with existing codebase**
   - What we know: Codebase uses TypeScript strict mode, no existing linter/formatter configured
   - What's unclear: Whether Biome recommended rules will flag issues in the existing ~30 source files
   - Recommendation: Run `npx @biomejs/biome check .` locally in Wave 1 before adding `biome ci` to CI workflows. Fix any violations or configure rule suppressions before wiring into CI.

---

## Sources

### Primary (HIGH confidence)
- [jsDocs.io/package/tsup](https://www.jsdocs.io/package/tsup) — Options type definition: noExternal, sourcemap, target, defineConfig array return type
- [github.com/softprops/action-gh-release](https://github.com/softprops/action-gh-release) — v2 current version, `generate_release_notes` flag
- [biomejs.dev/reference/cli](https://biomejs.dev/reference/cli/) — `biome ci` as the correct read-only CI command
- [biomejs.dev/reference/configuration](https://biomejs.dev/reference/configuration/) — biome.json schema and recommended ruleset
- [docs.github.com — Publishing Node.js packages](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages) — canonical setup-node + NODE_AUTH_TOKEN workflow
- [github.blog changelog — npm classic tokens revoked Dec 2025](https://github.blog/changelog/2025-12-09-npm-classic-tokens-revoked-session-based-auth-and-cli-token-management-now-available/) — granular tokens required

### Secondary (MEDIUM confidence)
- [httptoolkit.com — Automatic npm publishing with GHA](https://httptoolkit.com/blog/automatic-npm-publish-gha/) — granular token setup, registry-url requirement
- [remarkablemark.org — npm trusted publishing](https://remarkablemark.org/blog/2025/12/19/npm-trusted-publishing/) — OIDC workflow structure (confirmed deferred path)
- [debugdaily.dev — tsup bundle all deps](https://debugdaily.dev/egoist-tsup-how-can-include-all-depencies-in-the-final-indexjs-) — `noExternal: [/.*/]` pattern for CLI

### Tertiary (LOW confidence)
- WebSearch results confirming `npm pack --dry-run` as standard CI validation step (multiple sources, consistent)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — tsup and GHA actions verified via official docs and jsDocs.io API types
- Architecture: HIGH — workflow patterns verified against GitHub official docs; tsup options verified against API type definitions
- Pitfalls: HIGH — npm token changes verified against official GitHub changelog; setup-node `registry-url` requirement verified against official GHA docs

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (npm ecosystem stable; GHA action versions stable on v2/v4 tags)
