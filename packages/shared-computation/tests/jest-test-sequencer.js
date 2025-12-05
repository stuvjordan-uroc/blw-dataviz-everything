/**
 * Custom Jest test sequencer for shared-computation package.
 * 
 * Enforces test execution order to ensure foundational tests pass
 * before running tests that depend on their functionality.
 * 
 * Test dependency graph:
 * 
 *   statistics.test.ts (foundational - must pass first)
 *        ├─> statisticsUpdates.test.ts (tests Statistics update behavior)
 *        ├─> segmentViz.test.ts (tests SegmentViz geometry without data)
 *        │       └─> segmentVizHydrated.test.ts (tests SegmentViz with Wave 1 data)
 *        └───────────┴─> segmentVizUpdates.test.ts (requires both Statistics updates AND SegmentViz hydrated tests)
 * 
 * Linear execution order:
 * 1. statistics.test.ts - Foundational Statistics functionality
 * 2. statisticsUpdates.test.ts - Statistics update/delta behavior  
 * 3. segmentViz.test.ts - SegmentViz geometry (no data dependency)
 * 4. segmentVizHydrated.test.ts - SegmentViz with Wave 1 Statistics
 * 5. segmentVizUpdates.test.ts - SegmentViz response to Statistics updates
 * 
 * Combined with bail:1 in jest.config.js, if any prior test fails,
 * subsequent tests will not run.
 */

const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  /**
   * Sort tests to enforce execution order.
   */
  sort(tests) {
    const orderedTests = Array.from(tests);

    // Define the desired order
    const order = [
      'statistics.test.ts',
      'statisticsUpdates.test.ts',
      'segmentViz.test.ts',
      'segmentVizHydrated.test.ts',
      'segmentVizUpdates.test.ts',
    ];

    // Sort tests according to the defined order
    orderedTests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      // Find the index in our order array for each test
      const indexA = order.findIndex(name => pathA.includes(name));
      const indexB = order.findIndex(name => pathB.includes(name));

      // If both tests are in our order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only one test is in our order list, it comes first
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      // For other tests, use default alphabetical sorting
      return pathA.localeCompare(pathB);
    });

    return orderedTests;
  }
}

module.exports = CustomSequencer;