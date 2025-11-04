const Sequencer = require('@jest/test-sequencer').default;

/**
 * Custom Jest Test Sequencer
 * 
 * Controls the order in which test files are executed.
 * 
 * Strategy:
 * 1. Auth tests run first (foundational authentication tests)
 * 2. API polls admin tests run second (depend on auth working)
 * 3. Any other tests run alphabetically
 * 
 * Combined with bail: 1, this ensures that if auth tests fail,
 * subsequent tests won't run.
 */
class CustomSequencer extends Sequencer {
  sort(tests) {
    // Copy the array to avoid mutating the original
    const copyTests = Array.from(tests);

    return copyTests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;

      // Priority order for test directories
      const isAuthTestA = pathA.includes('/tests/auth/');
      const isAuthTestB = pathB.includes('/tests/auth/');
      const isApiPollsAdminTestA = pathA.includes('/tests/api-polls-admin/');
      const isApiPollsAdminTestB = pathB.includes('/tests/api-polls-admin/');

      // Auth tests always come first
      if (isAuthTestA && !isAuthTestB) return -1;
      if (!isAuthTestA && isAuthTestB) return 1;

      // API polls admin tests come second
      if (isApiPollsAdminTestA && !isApiPollsAdminTestB) return -1;
      if (!isApiPollsAdminTestA && isApiPollsAdminTestB) return 1;

      // For tests in the same category, maintain alphabetical order
      return pathA.localeCompare(pathB);
    });
  }
}

module.exports = CustomSequencer;
