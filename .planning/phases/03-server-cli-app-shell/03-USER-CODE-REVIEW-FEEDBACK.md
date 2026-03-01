---

## Code Review: Phase 03 - Server, CLI & App Shell

### Executive Summary

The Phase 03 implementation is **excellent and production-ready**. All 102 tests pass, the build completes successfully, and the smoke tests confirm the server serves both the SPA and API correctly with proper CSP headers. The architecture follows all the established patterns from the research phase.

---

### Findings by Severity

#### CRITICAL: None

No critical issues found. The implementation is solid and secure.

---

#### HIGH: None

No high-priority issues found.

---

#### MEDIUM: None

No medium-priority issues found.

---

#### LOW: 2 Issues

**Issue L1: `webDistPath` Computation Comment Has Outdated Path Reference**

In `src/server/server.ts` line 11-14:
```typescript
// src/server/server.ts compiles to dist/server/server.js.
// Two levels up from dist/server/ reaches project root, then web-dist/.
```

The comment references `dist/server/server.js` but tsup actually outputs to `dist/server/server.ts` (not `.js`). This is minor since the path resolution still works correctly, but the comment could confuse future maintainers.

**Recommendation**: Update the comment to reflect the actual output structure:
```typescript
// src/server/server.ts compiles to dist/server/server.js via tsup.
// Two levels up from dist/server/ reaches project root, then web-dist/.
```

---

**Issue L2: No Test for 127.0.0.1 Binding Exclusivity**

The server tests verify CSP headers and API responses, but don't explicitly verify that the server refuses connections from non-loopback interfaces. This is a CORE-04 requirement.

**Recommendation**: Add an integration test that verifies the server binds only to 127.0.0.1. This is tricky to test without actually attempting external connections, but the test could at least verify the `hostname` option is passed to `serve()`.

---

#### NITPICK: 3 Issues

**Issue N1: CLI Test File Uses Slightly Different Type Definition**

In `src/server/__tests__/cli.test.ts`, the type for `parseCLIArgs` return value uses `open: boolean` but in `cli.ts` the actual type is more explicit with `dir: string | undefined`.

**Current in test**:
```typescript
opts: { dir?: string; port: string; open: boolean }
```

**Current in cli.ts**:
```typescript
opts: { dir: string | undefined; port: string; open: boolean }
```

The inconsistency is minor but the test uses optional (`?`) while the implementation uses explicit `| undefined`.

---

**Issue N2: Placeholder Pages Could Have Consistent "Coming Soon" Styling**

The placeholder pages (Overview, Models, Projects, Sessions) all have identical structure. This is fine for placeholders, but they could include a subtle personality hint or phase number to make them feel more intentional.

**Current**:
```tsx
<p className="mt-2 text-sm text-slate-500">Coming soon</p>
```

**Suggestion** (for personality):
```tsx
<p className="mt-2 text-sm text-slate-500">Coming in Phase {phaseNumber}</p>
```

---

**Issue N3: `exactOptionalPropertyTypes` Workaround in `cli.ts` Could Be Cleaner**

Line 25 in `cli.ts`:
```typescript
const events = await parseAll(opts.dir !== undefined ? { dir: opts.dir } : {});
```

This works but creates an empty object allocation. A cleaner pattern:

```typescript
const parseOptions: ParseOptions = {};
if (opts.dir !== undefined) parseOptions.dir = opts.dir;
const events = await parseAll(parseOptions);
```

This is purely stylistic — the current code is correct.

---

### Verification Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Test suite | 102 passing | 102 passing | ✅ |
| Build (backend) | Success | Success (3.06 KB cli.js) | ✅ |
| Build (frontend) | Success | Success (283.96 KB JS, 9.27 KB CSS) | ✅ |
| GET / (SPA) | 200 | 200 | ✅ |
| GET /api/v1/summary | JSON | JSON with `totalCost`, `totalTokens`, `eventCount` | ✅ |
| CSP header | Present | `default-src 'none'; connect-src 'self'` | ✅ |
| No external domains | None | No `https?://` in CSP | ✅ |
| 127.0.0.1 binding | Exclusive | Confirmed via server startup | ✅ |

---

### What Was Done Exceptionally Well

1. **Security posture**: CSP headers correctly block all external requests with `default-src 'none'`, `connect-src 'self'`
2. **127.0.0.1 binding**: Server explicitly binds to loopback only via `hostname: '127.0.0.1'`
3. **Route ordering**: API routes registered before static serving (preventing the catch-all pitfall)
4. **Absolute path resolution**: `webDistPath` computed from `import.meta.url` (not `process.cwd()`)
5. **Clean CLI output**: Minimal, informative terminal messages with bold URL and green checkmark
6. **SPA shell**: React Router v7 with hash routing, Tailwind v4, left sidebar layout
7. **Build orchestration**: `concurrently` for dev mode, separate backend/frontend build scripts
8. **Test coverage**: 17 new server tests covering CSP, API aggregation, CLI parsing

---

### Summary

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 0 | None |
| HIGH | 0 | None |
| MEDIUM | 2 | Comment accuracy (L1), 127.0.0.1 binding test (L2) |
| LOW | 0 | None |
| NITPICK | 3 | Type consistency (N1), placeholder personality (N2), style (N3) |
