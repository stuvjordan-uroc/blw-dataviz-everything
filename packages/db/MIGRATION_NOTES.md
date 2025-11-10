# Database Migration Notes

## Split.totalWeight Field Addition (Phase 2.5)

**Date**: November 10, 2025

### Change Summary

Added `totalWeight: number` field to the `Split` interface in `shared-schemas/src/schemas/polls.ts`.

### Impact on Database

- **Table**: `polls.session_statistics`
- **Column**: `statistics` (JSONB type)
- **Change Type**: Schema evolution (no SQL migration needed)

### Migration Strategy

Since `statistics` is a JSONB column, this is a **schema evolution** rather than a structural database change:

1. **No SQL migration required**: JSONB columns are schemaless at the database level
2. **Backward compatibility**: Existing JSONB data without `totalWeight` will still work (TypeScript will treat missing field as undefined)
3. **Forward compatibility**: New computations will include `totalWeight` field

### Data Transition Plan

**Existing Data**:

- Rows in `session_statistics` with `statistics` computed before this change will NOT have `totalWeight` in their Split objects
- These will need recomputation to populate `totalWeight`
- Application code should handle missing `totalWeight` gracefully (treat as requiring full recomputation)

**New Data**:

- All calls to `computeSplitStatistics()` will now populate `totalWeight` for each Split
- All calls to `updateSplitStatistics()` will use and update `totalWeight` for incremental updates

### Recommended Actions

1. **For existing sessions with statistics**: Run full recomputation using `computeSplitStatistics()` to populate `totalWeight`
2. **For new sessions**: `totalWeight` will be populated automatically on first computation
3. **Application logic**: Check for presence of `totalWeight` before attempting incremental updates:
   ```typescript
   if (existingStatistics.some(split => split.totalWeight === undefined)) {
     // Missing totalWeight - run full recomputation
     return computeSplitStatistics(...);
   } else {
     // Can use incremental update
     return updateSplitStatistics(...);
   }
   ```

### Testing Considerations

- Unit tests updated to include `totalWeight` in mock Split objects
- Integration tests should verify `totalWeight` is correctly computed and updated
- No database migration tests needed (JSONB evolution is transparent)
