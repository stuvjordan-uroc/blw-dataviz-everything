"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionStatistics = exports.responses = exports.respondents = exports.questions = exports.sessions = exports.pollsSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const questions_1 = require("./questions");
/* CREATE POLLS SCHEMA AND ITS TABLES */
//schema
exports.pollsSchema = (0, pg_core_1.pgSchema)("polls");
;
//sessions table
exports.sessions = exports.pollsSchema.table("sessions", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionConfig: (0, pg_core_1.jsonb)("session_config").$type(),
    description: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow()
});
//questions table
exports.questions = exports.pollsSchema.table("questions", {
    id: (0, pg_core_1.serial)("id").primaryKey(), //this is unique to a question-session combination, because of the no-duplicate-questions-within-a-session constraint below.
    sessionId: (0, pg_core_1.integer)().references(() => exports.sessions.id),
    varName: (0, pg_core_1.text)().notNull(),
    batteryName: (0, pg_core_1.text)().notNull(),
    subBattery: (0, pg_core_1.text)()
}, (table) => [
    //Composite foreign key to questions schema
    (0, pg_core_1.foreignKey)({
        columns: [table.varName, table.batteryName, table.subBattery],
        foreignColumns: [questions_1.questions.varName, questions_1.questions.batteryName, questions_1.questions.subBattery]
    }),
    //ensure no duplicate questions within a session
    (0, pg_core_1.unique)().on(table.sessionId, table.varName, table.batteryName, table.subBattery)
]);
//respondents table
exports.respondents = exports.pollsSchema.table("respondents", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    sessionId: (0, pg_core_1.integer)().notNull().references(() => exports.sessions.id),
    // Optional: add other respondent metadata
    // createdAt: timestamp("created_at").defaultNow(),
    // anonymousId: text("anonymous_id"), // if you want to track across sessions
});
//responses table
exports.responses = exports.pollsSchema.table("responses", {
    respondentId: (0, pg_core_1.integer)().notNull().references(() => exports.respondents.id),
    questionSessionId: (0, pg_core_1.integer)().references(() => exports.questions.id),
    response: (0, pg_core_1.integer)(),
}, (table) => [
    // Ensure each respondent can only answer each question once
    (0, pg_core_1.unique)().on(table.respondentId, table.questionSessionId)
]);
//session_statistics table
exports.sessionStatistics = exports.pollsSchema.table("session_statistics", {
    sessionId: (0, pg_core_1.integer)().primaryKey().references(() => exports.sessions.id), //only one row per session!!! Note this means application will have to handle concurrent updates!
    statistics: (0, pg_core_1.jsonb)("statistics").$type(),
    computedAt: (0, pg_core_1.timestamp)("computed_at").defaultNow()
});
//# sourceMappingURL=polls.js.map