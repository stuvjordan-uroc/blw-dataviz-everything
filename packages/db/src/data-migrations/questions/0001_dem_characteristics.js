"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const shared_1 = require("shared");
const s3_1 = require("../utils/s3");
const drizzle_orm_1 = require("drizzle-orm");
const batteryNameImp = "democratic_characteristics_importance";
const batteryNamePerf = "democratic_characteristics_performance";
exports.migration = {
    name: 'questions_0001_dem_characteristics',
    up: async (db) => {
        // Fetch JSON from S3
        const bucket = (0, s3_1.getDataMigrationsBucket)();
        const data = await (0, s3_1.fetchJsonFromS3)(bucket, 'db/schemas/questions/perf-imp.json');
        // Insert the two batteries
        await db.insert(shared_1.batteries).values([
            {
                name: batteryNameImp,
                prefix: data.importance.prefix,
            },
            {
                name: batteryNamePerf,
                prefix: data.performance.prefix,
            },
        ]);
        // Get unique categories for sub-batteries
        const uniqueCategories = [...new Set(data.characteristics.map(c => c.category))];
        // Insert sub-batteries for both batteries
        const subBatteryValues = uniqueCategories.flatMap(category => [
            {
                batteryName: batteryNameImp,
                name: category,
            },
            {
                batteryName: batteryNamePerf,
                name: category,
            },
        ]);
        await db.insert(shared_1.subBatteries).values(subBatteryValues);
        // Insert questions for both batteries
        const questionValues = data.characteristics.flatMap(char => [
            // Importance question
            {
                varName: char.variable_name,
                text: char.question_text,
                batteryName: batteryNameImp,
                subBattery: char.category,
                responses: data.importance.responses,
            },
            // Performance question
            {
                varName: char.variable_name,
                text: char.question_text,
                batteryName: batteryNamePerf,
                subBattery: char.category,
                responses: data.performance.responses,
            },
        ]);
        await db.insert(shared_1.questions).values(questionValues);
    },
    down: async (db) => {
        // Delete in reverse order due to foreign keys
        await db.delete(shared_1.questions)
            .where((0, drizzle_orm_1.sql) `battery_name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);
        await db.delete(shared_1.subBatteries)
            .where((0, drizzle_orm_1.sql) `battery_name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);
        await db.delete(shared_1.batteries)
            .where((0, drizzle_orm_1.sql) `name IN ('dem_characteristics_importance', 'dem_characteristics_performance')`);
    },
};
//# sourceMappingURL=0001_dem_characteristics.js.map