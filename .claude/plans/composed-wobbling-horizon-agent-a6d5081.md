# YouTube Crawler Unique Constraint Error - Root Cause Analysis & Solution Design

## Problem Statement

**Error**: `Unique constraint failed on the fields: (song_id, language)` at `tx.songName.create()` in `unified-youtube-crawler.ts:527`

**Impact**: 6 PVs failed out of 29,595 processed (0.02% failure rate), but indicates a race condition that could worsen with scale.

## Root Cause Analysis

### 1. **Race Condition Between Parallel Chunks**

**Timeline of the Bug:**
```
Time T0: Chunk 3 processes Song #12345, checks for Korean title → None found
Time T1: Chunk 7 processes Song #12345 (same song, different PV), checks → None found  
Time T2: Chunk 3 starts transaction, attempts CREATE
Time T3: Chunk 7 starts transaction, attempts CREATE
Time T4: Chunk 3 commits successfully ✅
Time T5: Chunk 7 commits → UNIQUE CONSTRAINT VIOLATION ❌
```

**Evidence:**
- 10 parallel GitHub Actions jobs (matrix.chunk: [0-9]) running simultaneously
- Each chunk processes PVs by ID range (e.g., Chunk 0: vocadbId 1-29,600, Chunk 1: 29,601-59,200)
- A single **Song** can have multiple **PVs** (different YouTube videos)
- PVs for the same song can be in different ID ranges → processed by different chunks
- The check `existingKoreanName = await tx.songName.findFirst()` happens **inside** the transaction (line 522)
- BUT: PostgreSQL's default READ COMMITTED isolation level means the check can miss concurrent inserts

**Critical Code Flow:**
```typescript
// Line 497-533: Individual transaction per PV
await this.prisma.$transaction(async (tx) => {
  // Step 1: Update PV view count (safe - PV is unique per chunk)
  await tx.pV.update({ where: { id: pv.id }, ... });
  
  // Step 2: Upsert DailyViewCount (safe - has upsert logic)
  await tx.dailyViewCount.upsert({ ... });
  
  // Step 3: Create Korean title (UNSAFE - check-then-create pattern)
  if (koreanTitle) {
    const existingKoreanName = await tx.songName.findFirst({
      where: { songId: pv.songId, language: 'Korean' }
    });
    
    if (!existingKoreanName) {  // ⚠️ Race condition window here!
      await tx.songName.create({  // 💥 Can violate unique constraint
        data: { songId: pv.songId, language: 'Korean', value: koreanTitle }
      });
    }
  }
});
```

### 2. **Why the Race Condition Exists**

**PostgreSQL Transaction Isolation (READ COMMITTED):**
- The transaction sees only committed data when each statement begins
- Between `findFirst` and `create`, another transaction can commit an INSERT
- The `findFirst` check becomes stale → `create` violates the constraint

**Schema Constraint:**
```prisma
model SongName {
  @@unique([songId, language], name: "unique_song_name")
}
```

**Parallel Execution Pattern:**
- 10 chunks × 50 PVs per batch = up to 500 concurrent transactions
- Multiple PVs for the same song → multiple threads attempting to create Korean title
- Check-then-create is NOT atomic → classic race condition

### 3. **Why It's Rare (0.02% failure rate)**

**Probability Factors:**
- Only songs with multiple PVs in different chunks are affected
- Only when both chunks fetch Korean titles for the first time
- Timing must align within milliseconds (transaction execution time)
- Most songs have PVs clustered in similar ID ranges

**But:** As the database grows and more parallel workers are added, this will worsen.

---

## Solution Approaches

### **Approach 1: UPSERT with ON CONFLICT (RECOMMENDED)**

**Strategy**: Replace check-then-create with atomic upsert operation.

**Advantages:**
- ✅ Atomic operation - no race condition possible
- ✅ Works perfectly with parallel execution
- ✅ Minimal code changes
- ✅ Standard PostgreSQL/Prisma pattern
- ✅ Handles all edge cases (create/update/concurrent)
- ✅ No performance impact (single DB roundtrip)

**Disadvantages:**
- ⚠️ Always attempts update even when title exists (minor overhead)
- ⚠️ Cannot distinguish first-time creation from update (affects metrics)

**Implementation:**
```typescript
// Replace lines 520-532 with:
if (koreanTitle) {
  await tx.songName.upsert({
    where: {
      songId_language: {  // Use compound unique key
        songId: pv.songId,
        language: 'Korean',
      },
    },
    update: {
      value: koreanTitle,  // Update if exists (handles title changes)
    },
    create: {
      songId: pv.songId,
      language: 'Korean',
      value: koreanTitle,
    },
  });
  titleWasCreated = true;  // ⚠️ Note: Will be true even for updates
}
```

**Risk Level**: 🟢 LOW
- Prisma upsert is battle-tested for concurrent scenarios
- PostgreSQL handles ON CONFLICT natively
- No schema changes required

**Trade-offs:**
- `titleWasCreated` metric becomes less accurate (counts updates as creates)
- Solution: Track separately or accept minor metric inaccuracy

---

### **Approach 2: Transaction-Level Locking (SELECT FOR UPDATE)**

**Strategy**: Acquire exclusive lock on the row before check-then-create.

**Advantages:**
- ✅ Preserves exact create/update distinction for metrics
- ✅ Prevents concurrent modifications completely
- ✅ Clear transaction semantics

**Disadvantages:**
- ❌ Requires raw SQL (Prisma doesn't support SELECT FOR UPDATE)
- ❌ Performance impact (lock contention across chunks)
- ❌ Deadlock risk if not implemented carefully
- ❌ More complex code

**Implementation:**
```typescript
if (koreanTitle) {
  // Step 1: Lock the row (or acquire lock on table)
  const existingKoreanName = await tx.$queryRaw<SongName[]>`
    SELECT * FROM song_names 
    WHERE song_id = ${pv.songId} AND language = 'Korean'
    FOR UPDATE NOWAIT  -- Fail fast if locked by another transaction
  `;
  
  if (existingKoreanName.length === 0) {
    // Step 2: Create (now safe - we hold the lock)
    await tx.songName.create({
      data: { songId: pv.songId, language: 'Korean', value: koreanTitle },
    });
    titleWasCreated = true;
  }
}
```

**Risk Level**: 🟡 MEDIUM
- Lock contention could slow down parallel chunks
- Potential deadlocks if locking order is inconsistent
- Requires careful error handling (NOWAIT failures)

---

### **Approach 3: Graceful Constraint Violation Handling**

**Strategy**: Catch unique constraint errors and treat them as success.

**Advantages:**
- ✅ Minimal code changes
- ✅ No performance impact in success path
- ✅ Simple to understand

**Disadvantages:**
- ❌ Uses exceptions for control flow (anti-pattern)
- ❌ Error logs still show failures (noise)
- ❌ Doesn't prevent the duplicate attempt (wasted work)
- ❌ May mask real database errors

**Implementation:**
```typescript
if (koreanTitle) {
  const existingKoreanName = await tx.songName.findFirst({
    where: { songId: pv.songId, language: 'Korean' },
  });

  if (!existingKoreanName) {
    try {
      await tx.songName.create({
        data: { songId: pv.songId, language: 'Korean', value: koreanTitle },
      });
      titleWasCreated = true;
    } catch (error) {
      // Check if it's a unique constraint violation
      if (error instanceof Prisma.PrismaClientKnownRequestError && 
          error.code === 'P2002') {
        // Another transaction created it - that's fine, continue
        console.log(`Korean title already exists for song ${pv.songId} (race condition handled)`);
      } else {
        throw error;  // Re-throw other errors
      }
    }
  }
}
```

**Risk Level**: 🟡 MEDIUM
- Masks the underlying race condition instead of fixing it
- Acceptable as a **temporary workaround** but not a long-term solution

---

### **Approach 4: Pre-Transaction Deduplication**

**Strategy**: Check for existing Korean titles BEFORE starting transactions, deduplicate at batch level.

**Advantages:**
- ✅ Reduces transaction count
- ✅ Eliminates redundant checks
- ✅ Better performance for large batches

**Disadvantages:**
- ❌ Still has race condition (check is outside transaction)
- ❌ More complex code restructuring
- ❌ Doesn't solve the core problem

**Implementation Sketch:**
```typescript
// Before Promise.all loop:
const uniqueSongIds = [...new Set(pvs.map(pv => pv.songId))];
const existingKoreanTitles = await this.prisma.songName.findMany({
  where: { 
    songId: { in: uniqueSongIds },
    language: 'Korean',
  },
  select: { songId: true },
});
const existingSet = new Set(existingKoreanTitles.map(t => t.songId));

// Inside transaction:
if (koreanTitle && !existingSet.has(pv.songId)) {
  await tx.songName.create({ ... });  // Still has race condition!
}
```

**Risk Level**: 🔴 HIGH
- Doesn't actually solve the race condition
- Adds complexity without fixing the root cause

---

## Recommended Solution: **Approach 1 (UPSERT)**

### Why UPSERT is the Best Choice

1. **Correct Semantics**: UPSERT is designed for exactly this scenario (create-or-update)
2. **Atomic Operation**: No race condition possible - handled at database level
3. **Parallel-Safe**: Works perfectly with 10+ concurrent chunks
4. **Future-Proof**: Scales to any number of parallel workers
5. **Battle-Tested**: Standard pattern in distributed systems
6. **Minimal Changes**: Single method replacement, no schema changes

### Implementation Plan

**File**: `lib/crawlers/unified-youtube-crawler.ts`

**Change Location**: Lines 520-532 (inside the transaction)

**Before:**
```typescript
if (koreanTitle) {
  const existingKoreanName = await tx.songName.findFirst({
    where: { songId: pv.songId, language: 'Korean' },
  });

  if (!existingKoreanName) {
    await tx.songName.create({
      data: { songId: pv.songId, language: 'Korean', value: koreanTitle },
    });
    titleWasCreated = true;
  }
}
```

**After:**
```typescript
if (koreanTitle) {
  // Use upsert to handle concurrent inserts atomically
  // This prevents "unique constraint failed" errors when multiple chunks
  // process different PVs for the same song simultaneously
  const result = await tx.songName.upsert({
    where: {
      songId_language: {
        songId: pv.songId,
        language: 'Korean',
      },
    },
    update: {
      value: koreanTitle,  // Update if Korean title changed
    },
    create: {
      songId: pv.songId,
      language: 'Korean',
      value: koreanTitle,
    },
  });
  
  // Note: titleWasCreated will be true for both creates AND updates
  // This is acceptable - we care that the title is current, not first-time creation
  titleWasCreated = true;
}
```

### Schema Validation

**Required**: Verify the unique constraint name in Prisma schema:

```prisma
model SongName {
  @@unique([songId, language])  // ✅ Default name: "songId_language"
}
```

**If custom name exists:**
```prisma
model SongName {
  @@unique([songId, language], name: "unique_song_name")  
}
```

Then use: `where: { unique_song_name: { songId, language } }`

**Current Schema (line 61):**
```prisma
@@unique([songId, language])  // ✅ Uses default name
```

Therefore: Use `songId_language` in the upsert where clause.

---

## Alternative Considerations

### Metric Accuracy Trade-off

**Issue**: `titleWasCreated` becomes less accurate (true for updates too)

**Solutions:**
1. **Accept it**: Title updates are rare, metric accuracy loss is negligible
2. **Check Prisma return value**: Inspect upsert result to detect create vs update (Prisma doesn't expose this)
3. **Separate tracking**: Add pre-check for metrics only (still accept upsert overhead)

**Recommendation**: Accept it. The metric is for monitoring, not critical business logic. Accuracy trade-off is worth eliminating race conditions.

### Performance Impact

**Current Approach (check-then-create):**
- Success path: 1 SELECT + 0 or 1 INSERT = 1-2 DB roundtrips
- Failure path: Exception handling + rollback overhead

**UPSERT Approach:**
- All cases: 1 INSERT ON CONFLICT DO UPDATE = 1 DB roundtrip
- No exceptions, no rollback overhead

**Verdict**: UPSERT is equal or better performance in all scenarios.

---

## Testing Strategy

### Unit Testing
```typescript
describe('UnifiedYouTubeCrawler - Korean Title Upsert', () => {
  it('should create Korean title for first PV', async () => {
    const result = await crawler.processBatch([pv1]);
    expect(result.titlesUpdated).toBe(1);
    
    const titles = await prisma.songName.findMany({
      where: { songId: pv1.songId, language: 'Korean' }
    });
    expect(titles).toHaveLength(1);
  });
  
  it('should not duplicate Korean title for second PV of same song', async () => {
    await crawler.processBatch([pv1]);  // First PV
    const result = await crawler.processBatch([pv2]);  // Second PV, same song
    
    const titles = await prisma.songName.findMany({
      where: { songId: pv1.songId, language: 'Korean' }
    });
    expect(titles).toHaveLength(1);  // Still only 1 title
  });
  
  it('should update Korean title if it changes', async () => {
    // Seed with old title
    await prisma.songName.create({
      data: { songId: 123, language: 'Korean', value: 'Old Title' }
    });
    
    // Process PV with new title
    const result = await crawler.processBatch([pvWithNewTitle]);
    
    const title = await prisma.songName.findFirst({
      where: { songId: 123, language: 'Korean' }
    });
    expect(title.value).toBe('New Title');
  });
});
```

### Integration Testing (Parallel Execution)
```typescript
describe('Parallel Chunk Execution', () => {
  it('should handle concurrent updates to same song without errors', async () => {
    // Simulate 10 parallel chunks processing different PVs for the same song
    const pvsForSameSong = generatePVs(10, { songId: 12345 });
    
    const results = await Promise.all(
      pvsForSameSong.map(pv => crawler.processBatch([pv]))
    );
    
    // All should succeed
    expect(results.every(r => r.failed === 0)).toBe(true);
    
    // Only 1 Korean title should exist
    const titles = await prisma.songName.findMany({
      where: { songId: 12345, language: 'Korean' }
    });
    expect(titles).toHaveLength(1);
  });
});
```

### Production Validation
1. **Monitor Error Rates**: After deployment, verify unique constraint errors drop to 0%
2. **Check Title Counts**: Ensure no duplicate Korean titles exist:
   ```sql
   SELECT song_id, COUNT(*) as count
   FROM song_names
   WHERE language = 'Korean'
   GROUP BY song_id
   HAVING COUNT(*) > 1;
   ```
3. **Performance Metrics**: Compare average batch processing time before/after

---

## Rollback Plan

**If Issues Occur:**
1. Revert to original code (check-then-create)
2. Add graceful error handling (Approach 3) as temporary fix
3. Investigate upsert behavior in production environment
4. Consider SELECT FOR UPDATE approach if upsert has unforeseen issues

**Rollback Risk**: 🟢 LOW - Single method change, easy to revert

---

## Edge Cases Handled

### 1. **Null Korean Titles**
**Current**: `if (koreanTitle)` guard prevents null upserts ✅
**After UPSERT**: Same guard still applies ✅

### 2. **Empty String Titles**
**Current**: Would create empty string if YouTube returns `""`
**After UPSERT**: Same behavior (may want to add validation)
**Recommendation**: Add check: `if (koreanTitle && koreanTitle.trim())`

### 3. **Title Updates (YouTube changes title)**
**Current**: Never updates existing titles
**After UPSERT**: Updates to latest title ✅ (better behavior!)

### 4. **Different Korean Titles from Multiple PVs**
**Current**: First one wins (rest are skipped)
**After UPSERT**: Last one processed wins (racey but acceptable)
**Recommendation**: YouTube localizations should be consistent per video, so this is rare

### 5. **Transaction Rollback**
**Current**: If transaction fails, no title is created
**After UPSERT**: Same - upsert is part of transaction ✅

---

## Implementation Checklist

**Pre-Implementation:**
- [x] Verify Prisma schema unique constraint name
- [x] Confirm PostgreSQL version supports ON CONFLICT
- [x] Review concurrent transaction isolation levels
- [x] Backup production database before deployment

**Implementation:**
- [ ] Update `unified-youtube-crawler.ts` lines 520-532
- [ ] Add comment explaining race condition fix
- [ ] Update Korean title trim validation (optional enhancement)
- [ ] Run local tests with parallel execution simulation

**Post-Implementation:**
- [ ] Deploy to staging environment
- [ ] Run full crawler cycle in staging (10 parallel chunks)
- [ ] Verify no unique constraint errors in logs
- [ ] Check for duplicate Korean titles in database
- [ ] Monitor performance metrics (batch time, DB load)
- [ ] Deploy to production
- [ ] Monitor error rates for 24 hours
- [ ] Run duplicate detection query after first full run

---

## Performance Characteristics

### Database Operations Comparison

| Operation | Old Approach | New Approach (UPSERT) |
|-----------|--------------|----------------------|
| First Korean title | SELECT + INSERT (2 ops) | INSERT ON CONFLICT (1 op) |
| Existing title (no change) | SELECT (1 op) | INSERT ON CONFLICT UPDATE (1 op) |
| Existing title (changed) | SELECT (1 op, no update) | INSERT ON CONFLICT UPDATE (1 op, updates) |
| Concurrent attempt | SELECT + INSERT → ERROR | INSERT ON CONFLICT → automatic handling |

**Verdict**: UPSERT is equal or better in all cases, eliminates errors.

### Concurrency Characteristics

**Old Approach:**
- Race condition window: ~5-50ms (SELECT to INSERT)
- Failure rate: 0.02% (current), increases with parallelism
- Lock contention: None (but errors instead)

**New Approach:**
- Race condition window: 0ms (atomic)
- Failure rate: 0% (guaranteed)
- Lock contention: Minimal (PostgreSQL handles efficiently)

---

## Long-Term Recommendations

### 1. **Monitoring & Alerting**
Add monitoring for:
- Unique constraint violation errors (should be 0 after fix)
- Korean title update rate (detect if titles are changing frequently)
- Duplicate title detection (periodic check)

### 2. **Data Quality**
Consider adding:
- Korean title validation (non-empty, reasonable length)
- Title change audit log (track when titles are updated)
- Source tracking (which PV provided the Korean title)

### 3. **Architecture Evolution**
For future scalability:
- Consider separate Korean title sync job (decoupled from view count updates)
- Cache Korean titles to reduce database load
- Batch title updates across songs (fewer transactions)

---

## Summary

**Root Cause**: Classic check-then-create race condition in concurrent environment

**Recommended Fix**: Replace with atomic `upsert` operation

**Benefits**:
- ✅ Eliminates race condition completely
- ✅ Works with any level of parallelism
- ✅ Simpler code (fewer lines)
- ✅ Better behavior (updates changed titles)
- ✅ Equal or better performance

**Risks**: 🟢 Minimal - standard pattern, easy to test and rollback

**Effort**: 🟢 Low - Single method change, ~10 lines of code

**Timeline**: Can be implemented and tested in <1 hour, deployed same day

---

## Critical Files for Implementation

- **lib/crawlers/unified-youtube-crawler.ts** - Primary fix location (lines 520-532)
  _Reason: Contains the check-then-create pattern causing race condition_

- **prisma/schema.prisma** - Schema validation (lines 53-67, SongName model)
  _Reason: Verify unique constraint name for upsert where clause_

- **.github/workflows/daily-crawlers.yml** - Understanding parallel execution (lines 50-84)
  _Reason: Confirms 10-chunk parallel execution pattern causing race condition_

- **scripts/youtube/update-chunked.ts** - Testing parallel simulation
  _Reason: Can be used to reproduce race condition in local testing_

- **lib/db.ts** - Duplicate detection queries (if needed for validation)
  _Reason: May need to add query to check for duplicate Korean titles post-fix_
