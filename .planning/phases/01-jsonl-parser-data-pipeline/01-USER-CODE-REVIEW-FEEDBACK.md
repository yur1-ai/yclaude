The parser ran successfully against real data. Now let me compile my comprehensive code review feedback.

---

## Code Review: Phase 01 - JSONL Parser & Data Pipeline

### Executive Summary

The Phase 01 implementation is **solid and well-architected**. The parser correctly discovers JSONL files, handles malformed lines gracefully, deduplicates by UUID, and extracts all token fields. All 82 tests pass, the build succeeds, and real-data verification shows correct behavior.

---

### Findings by Severity

#### CRITICAL: None

No critical issues found. The implementation correctly handles all CORE-01 success criteria.

---

#### HIGH: 1 Issue

**Issue H1: Test File Duplication Creates Maintenance Burden**

There are **duplicate test files** covering the same modules:
- `src/parser/dedup.test.ts` and `src/parser/__tests__/dedup.test.ts`
- `src/parser/normalizer.test.ts` and `src/parser/__tests__/normalizer.test.ts`
- `src/parser/reader.test.ts` and `src/parser/__tests__/reader.test.ts`
- `src/shared/debug.test.ts` and `src/parser/__tests__/debug.test.ts`
- `src/index.test.ts` and `src/parser/__tests__/index.test.ts`

This creates confusion and maintenance overhead. Both locations are picked up by Vitest, so all 82 tests run. However, the Summary documents (01-02-SUMMARY, 01-03-SUMMARY) reference different file locations than where some files actually exist.

**Recommendation**: Consolidate to one location. The `src/parser/__tests__/` pattern is conventional for Vitest/Jest and keeps tests separate from source. Move all tests there and remove the colocated `.test.ts` files.

---

#### MEDIUM: 2 Issues

**Issue M1: `discoverJSONLFiles` Path Logic Has Redundant Pattern Construction**

In `src/parser/reader.ts` lines 38-41, the pattern construction has unnecessary redundancy:

```typescript
const pattern = useProjectsSubdir
  ? path.join(base, 'projects', '**', '*.jsonl')
  : path.join(base, '**', '*.jsonl');
```

The `claudeConfigDir` case and default case both produce the same pattern (`.../projects/**/*.jsonl`), but the code has three branches that all resolve to the same pattern for two of the cases.

**Recommendation**: Simplify to two clear branches:
```typescript
const pattern = useProjectsSubdir
  ? path.join(base, 'projects', '**', '*.jsonl')
  : path.join(base, '**', '*.jsonl');
```

This is functionally correct but the current code has vestigial complexity from a three-branch structure that was simplified.

---

**Issue M2: Missing Test for `durationMs` Extraction in Colocated Tests**

The colocated `normalizer.test.ts` (lines 87-103) doesn't test `durationMs` extraction, but the `__tests__/normalizer.test.ts` does (lines 79-89). The colocated tests are missing coverage for this field.

**Recommendation**: Ensure both test files have consistent coverage, or better yet, consolidate to one location (see H1).

---

#### LOW: 3 Issues

**Issue L1: No Validation of Token Count Plausibility**

The normalizer accepts any numeric values for tokens without validation. While this is correct for parsing (we want to accept what Claude Code gives us), there's no safeguard against obviously wrong data (negative numbers, NaN, Infinity).

**Recommendation**: Consider adding defensive validation in the normalizer:
```typescript
function toNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : 0;
  return Number.isFinite(num) && num >= 0 ? num : 0;
}
```

---

**Issue L2: `debugLog` Uses Sync `process.stderr.write` Which Can Block**

In `src/parser/reader.ts`, each malformed line triggers a `debugLog` call which writes synchronously to stderr. For files with many malformed lines, this could block the event loop.

**Recommendation**: Consider buffering debug logs or using an async write. However, given the expected use case (debug mode is off by default, and malformed lines should be rare), this is a minor concern.

---

**Issue L3: Test Helper `createTempJsonl` Uses Fragile Path Splitting**

In `src/parser/reader.test.ts` lines 8-14, the path manipulation uses `split('/')` which is not cross-platform:

```typescript
tempDirs.push(file.split('/').slice(0, -1).join('/'));
```

On Windows, paths use backslashes, so this would fail.

**Recommendation**: Use `path.dirname()` from `node:path`:
```typescript
import { dirname } from 'node:path';
tempDirs.push(dirname(file));
```

---

#### NITPICK: 5 Issues

**Issue N1: Import Style Inconsistency in `src/index.ts`**

Line 12 uses a dynamic import type pattern that's inconsistent with the static import on line 5:

```typescript
export async function parseAll(options: ParseOptions = {}): Promise<import('./parser/types.js').NormalizedEvent[]> {
```

The static import `ParseOptions` is used for the parameter, but a dynamic import is used for the return type. Both should use the static import for consistency.

**Recommendation**: Use the pre-imported type:
```typescript
export async function parseAll(options: ParseOptions = {}): Promise<NormalizedEvent[]> {
```

---

**Issue N2: `type` Field in `makeEvent` Helper Differs Between Test Files**

In `src/parser/dedup.test.ts`:
```typescript
function makeEvent(uuid: string, extra?: Partial<NormalizedEvent>): NormalizedEvent {
  return { uuid, type: 'assistant', timestamp: '2026-01-01T00:00:00Z', sessionId: 'sess-1', ...extra };
}
```

In `src/parser/__tests__/dedup.test.ts`:
```typescript
function makeEvent(uuid: string, type = 'assistant'): NormalizedEvent {
  return {
    uuid,
    type,
    timestamp: '2024-01-01T00:00:00Z',
    sessionId: 'session-1',
  };
}
```

The default timestamp differs (2026 vs 2024). This is purely cosmetic but shows lack of consistency.

---

**Issue N3: `.claude/gsd-file-manifest.json` Listed in Git Status but Not in .gitignore**

The git status shows `.claude/` as untracked. If this is an auto-generated file from the GSD workflow, it should probably be in `.gitignore`.

---

**Issue N4: Zod Schemas Are Defined but Not Used for Runtime Validation**

The Zod schemas in `schema.ts` are well-defined but the normalizer doesn't use them for runtime validation - it uses manual type checking. The schemas are only used in tests.

**Recommendation**: Consider using Zod for runtime validation in the normalizer, or document that schemas are for test fixtures only. Current approach is valid but should be documented.

---

**Issue N5: Missing JSDoc for Public API**

The `parseAll` function in `src/index.ts` lacks JSDoc. Since this is the main public API that Phase 2 will consume, it should have documentation:

```typescript
/**
 * Parse all JSONL events from Claude Code data directories.
 * 
 * @param options - Configuration options
 * @returns Array of normalized events, deduplicated by UUID
 */
```

---

### What Was Done Well

1. **Excellent test coverage**: 82 tests across 11 files covering all CORE-01 success criteria
2. **Clean architecture**: Proper separation of concerns (reader, normalizer, dedup, debug)
3. **Native Node.js APIs**: Used `node:fs/promises` `glob()` instead of third-party dependencies
4. **Future-proofing**: `.passthrough()` on Zod schemas and unknown field handling in normalizer
5. **Error resilience**: Parser never crashes on malformed lines
6. **Correct deduplication**: Map-based with first-seen-wins semantics
7. **Real data verification**: Successfully parsed 33 JSONL files with 3,212 events

---

### Summary

| Severity | Count | Issues |
|----------|-------|--------|
| CRITICAL | 0 | None |
| HIGH | 1 | Test file duplication (H1) |
| MEDIUM | 2 | Path logic redundancy (M1), Missing test coverage (M2) |
| LOW | 3 | Token validation (L1), Sync stderr write (L2), Path splitting (L3) |
| NITPICK | 5 | Import consistency (N1), Test helper variance (N2), .gitignore (N3), Schema usage (N4), JSDoc (N5) |
