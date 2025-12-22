# Next Steps for Update Function Testing

## Context

We have successfully:

- ✅ Extracted three helper functions from `update.ts` into `updateHelpers.ts`
- ✅ Refactored `update.ts` to use these helpers
- ✅ Verified all existing tests (105 tests) still pass

## Remaining Work

### Phase 1: Test Helper Functions (`updateHelpers.test.ts`)

Create unit tests for the three extracted helpers:

**`createExpandedToCollapsedResponseGroupMap`:**

- Various configurations with different numbers of expanded/collapsed groups
- Edge cases: single group, many groups
- Verify correct mapping when expanded groups nest cleanly in collapsed groups
- Verify -1 return value for unmapped groups (though this shouldn't happen in valid configs)

**`mergePointsFromBasisSplits`:**

- Merge from single basis split (identity operation)
- Merge from 2 basis splits with different point sets
- Merge from 3+ basis splits
- Edge cases: empty basis splits, basis splits with empty point arrays
- Verify points are grouped correctly by expanded response group index

**`aggregatePointChangesFromDiffs`:**

- Aggregate from single response group
- Aggregate from multiple response groups
- Aggregate from multiple diffs
- Edge cases: empty diffs, diffs with no changes, null/undefined point arrays
- Verify both added and removed points are collected correctly

### Phase 2: Test `updateBasisSplitPoints` (`updatePoints.test.ts`)

Pure unit tests for point array manipulation:

**Core functionality:**

- Add points when count increases
- Remove points when count decreases
- No change when count stays the same
- Empty start (no existing points)

**ID generation:**

- Verify IDs continue from last existing ID
- Verify ID continuity across multiple updates

**Diff structure:**

- Verify added array is correct
- Verify removed array is correct
- Verify array indices match response group indices

### Phase 3: Test `updateBasisSplitWithSegmentsFromResponses` (`updateBasisSplit.test.ts`)

Integration tests using **outcome verification** approach:

**Core outcomes to verify:**

- Point counts match expected after update
- Segment bounds are within segment group bounds
- Point positions are within segment bounds
- Expanded/collapsed consistency (collapsed segments contain all points from their expanded segments)

**Diff verification:**

- New state is correct (primary assertion)
- Diff values equal (new - old)
- Diff structure is complete (no missing fields)

**Threshold behavior:**

- Create scenarios with >10% width change (triggers full recomputation)
- Create scenarios with ≤10% width change (triggers incremental update)
- Verify both paths produce correct outcomes

### Phase 4: Test `updateSplitWithSegmentsFromUpdatedBasisSplitsWithSegments` (`updateSplit.test.ts`)

Integration tests focusing on **point merging** and aggregation:

**Point merging scenarios:**

- Update from 2 basis splits with different point sets
- Update from 3 basis splits
- Verify merged points appear in correct segments
- Verify aggregated changes (added/removed) are reflected correctly

**Threshold behavior with merged data:**

- Test width change threshold with merged point sets
- Verify outcomes are correct regardless of which code path is taken

**Diff verification:**

- Same approach as Phase 3 (new state, diff values, structure)

### Phase 5: Decision on `updateAllSplitsWithSegmentsFromResponses`

After Phases 1-4 are complete:

- Evaluate if this function needs dedicated tests
- If components are well-tested, might only need 1-2 smoke tests
- Or skip entirely if confidence is high from component testing

### Phase 6: New unit test of view map functionality of initializeSplitsWithSegments

- test that view maps are returned as required.
- test that none of the update function alter the structure of the array of
  SplitWithSegmentGroup in ways that would ake the view maps invalid.

## Testing Philosophy

**Outcome Verification Over Path Verification:**

- Focus on verifying the end result is correct
- Don't test which specific function was called (no spies)
- This makes tests less brittle and more meaningful

**Diff Testing:**
For each test that produces a diff, verify:

1. New state is correct (primary assertion)
2. Diff values are mathematically correct (new - old = diff)
3. Diff structure is complete (no missing fields)

**Fixtures:**

- Extend or create helpers for generating test splits, configs, and responses
- May reuse `createSegmentVizConfig` from geometry tests
- Create simple, understandable test scenarios

## File Organization

```
test/segmentViz/
  updateHelpers.test.ts       # Phase 1
  updatePoints.test.ts        # Phase 2
  updateBasisSplit.test.ts    # Phase 3
  updateSplit.test.ts         # Phase 4
  (optional) updateAll.test.ts # Phase 5
```

## Notes

- Start with Phase 1 to establish testing patterns
- Each phase builds on previous phases
- Can refine approach after Phase 1 if needed
- All update functions integrate already-tested functions (from statistics/ and geometry.ts)
- Focus tests on the unique logic in each update function, not on re-testing integrated functions
