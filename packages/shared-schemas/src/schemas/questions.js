"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.questions = exports.subBatteries = exports.batteries = exports.questionsSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
/* CREATE QUESTIONS SCHEMA AND ITS TABLES */
//schema
exports.questionsSchema = (0, pg_core_1.pgSchema)("questions");
//batteries table
exports.batteries = exports.questionsSchema.table("batteries", {
    name: (0, pg_core_1.text)().notNull().primaryKey(),
    prefix: (0, pg_core_1.text)(),
});
//sub-batteries table
exports.subBatteries = exports.questionsSchema.table("sub_batteries", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    batteryName: (0, pg_core_1.text)().notNull().references(() => exports.batteries.name),
    name: (0, pg_core_1.text)().notNull()
}, (table) => [
    //insure that the set of sub-batteries belonging to any battery has no duplicates.
    (0, pg_core_1.unique)().on(table.batteryName, table.name)
]);
//questions table
exports.questions = exports.questionsSchema.table("questions", {
    varName: (0, pg_core_1.text)().notNull(),
    text: (0, pg_core_1.text)(),
    batteryName: (0, pg_core_1.text)()
        .notNull()
        .references(() => exports.batteries.name),
    subBattery: (0, pg_core_1.text)(),
    responses: (0, pg_core_1.text)().array(), //index in this array will give coded response in responses table
}, (table) => [
    // Composite primary key
    (0, pg_core_1.primaryKey)({ columns: [table.varName, table.batteryName, table.subBattery] }),
    // Composite foreign key: ensures subBattery belongs to the correct battery
    // References the unique constraint (batteryName, name) in subBatteries
    (0, pg_core_1.foreignKey)({
        columns: [table.batteryName, table.subBattery],
        foreignColumns: [exports.subBatteries.batteryName, exports.subBatteries.name]
    })
]);
//# sourceMappingURL=questions.js.map