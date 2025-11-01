"use strict";
/**
 * Example usage of the Zod validation schemas
 * Run with: npx tsx test-zod-schemas.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
const questions_zod_1 = require("./src/schemas/questions.zod");
console.log('=== Testing Zod Schemas for Questions Tables ===\n');
// ============================================================================
// TEST 1: Valid battery insert
// ============================================================================
console.log('TEST 1: Valid battery insert');
const validBattery = {
    name: 'test_battery',
    prefix: 'TB',
};
try {
    const result = questions_zod_1.insertBatterySchema.parse(validBattery);
    console.log('✅ Valid battery data:', result);
}
catch (error) {
    console.log('❌ Validation failed:', error);
}
// ============================================================================
// TEST 2: Battery insert without prefix (should be valid - prefix is optional)
// ============================================================================
console.log('\nTEST 2: Battery insert without prefix');
const batteryWithoutPrefix = {
    name: 'minimal_battery',
};
try {
    const result = questions_zod_1.insertBatterySchema.parse(batteryWithoutPrefix);
    console.log('✅ Valid battery without prefix:', result);
}
catch (error) {
    console.log('❌ Validation failed:', error);
}
// ============================================================================
// TEST 3: Invalid battery (missing required name field)
// ============================================================================
console.log('\nTEST 3: Invalid battery - missing name');
const invalidBattery = {
    prefix: 'TB',
};
try {
    const result = questions_zod_1.insertBatterySchema.parse(invalidBattery);
    console.log('✅ Valid:', result);
}
catch (error) {
    console.log('❌ Validation failed (expected):', error.errors[0].message);
}
// ============================================================================
// TEST 4: Valid sub-battery insert (without ID - it's auto-generated)
// ============================================================================
console.log('\nTEST 4: Valid sub-battery insert');
const validSubBattery = {
    batteryName: 'test_battery',
    name: 'sub_category_1',
};
try {
    const result = questions_zod_1.insertSubBatterySchema.parse(validSubBattery);
    console.log('✅ Valid sub-battery:', result);
}
catch (error) {
    console.log('❌ Validation failed:', error);
}
// ============================================================================
// TEST 5: Valid question insert
// ============================================================================
console.log('\nTEST 5: Valid question insert');
const validQuestion = {
    varName: 'q1',
    text: 'How important is this?',
    batteryName: 'test_battery',
    subBattery: 'sub_category_1',
    responses: ['Very important', 'Somewhat important', 'Not important'],
};
try {
    const result = questions_zod_1.insertQuestionSchema.parse(validQuestion);
    console.log('✅ Valid question:', result);
}
catch (error) {
    console.log('❌ Validation failed:', error);
}
// ============================================================================
// TEST 6: Question with minimal fields
// ============================================================================
console.log('\nTEST 6: Question with only required fields');
const minimalQuestion = {
    varName: 'q2',
    batteryName: 'test_battery',
    subBattery: 'sub_category_1',
};
try {
    const result = questions_zod_1.insertQuestionSchema.parse(minimalQuestion);
    console.log('✅ Valid minimal question:', result);
}
catch (error) {
    console.log('❌ Validation failed:', error);
}
// ============================================================================
// TEST 7: Using safeParse for non-throwing validation
// ============================================================================
console.log('\nTEST 7: Using safeParse (non-throwing)');
const result = questions_zod_1.insertBatterySchema.safeParse({ name: 'test' });
if (result.success) {
    console.log('✅ Validation succeeded:', result.data);
}
else {
    console.log('❌ Validation failed:', result.error.errors);
}
console.log('\n=== All tests complete ===');
//# sourceMappingURL=test-zod-schemas.js.map