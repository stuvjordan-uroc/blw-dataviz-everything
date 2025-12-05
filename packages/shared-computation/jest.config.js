const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  testSequencer: "./tests/jest-test-sequencer.js",
  // Stop running tests after first failure
  // This ensures segmentVizHydrated.test.ts won't run if foundational tests fail
  bail: 1,
};