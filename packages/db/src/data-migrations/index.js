"use strict";
/**
 * Data Migrations Index
 *
 * Central export point for all data migrations organized by PostgreSQL schema.
 *
 * IMPORTANT: When schema changes, update ALL data migrations to work with
 * the current schema definitions.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataMigrationsTracking = exports.ensureTrackingTable = exports.getAppliedMigrations = exports.rollbackAllDataMigrations = exports.rollbackDataMigration = exports.runDataMigrations = exports.allMigrations = exports.allMigrationsBySchema = void 0;
const index_js_1 = __importDefault(require("./questions/index.js"));
// import { responsesMigrations } from './responses'; // Add when responses schema exists
/**
 * All data migrations organized by PostgreSQL schema
 *
 * Migrations within each schema are independent.
 * Migrations execute in this order:
 * 1. questions
 * 2. responses (when added)
 */
exports.allMigrationsBySchema = [
    {
        schema: 'questions',
        migrations: index_js_1.default,
    },
    // Add more schemas here as they are created
    // {
    //   schema: 'responses',
    //   migrations: responsesMigrations,
    // },
];
/**
 * Flattened list of all migrations for running all at once
 */
exports.allMigrations = exports.allMigrationsBySchema.flatMap(s => s.migrations);
// Re-export everything from core for convenience
var core_1 = require("./core");
Object.defineProperty(exports, "runDataMigrations", { enumerable: true, get: function () { return core_1.runDataMigrations; } });
Object.defineProperty(exports, "rollbackDataMigration", { enumerable: true, get: function () { return core_1.rollbackDataMigration; } });
Object.defineProperty(exports, "rollbackAllDataMigrations", { enumerable: true, get: function () { return core_1.rollbackAllDataMigrations; } });
Object.defineProperty(exports, "getAppliedMigrations", { enumerable: true, get: function () { return core_1.getAppliedMigrations; } });
Object.defineProperty(exports, "ensureTrackingTable", { enumerable: true, get: function () { return core_1.ensureTrackingTable; } });
Object.defineProperty(exports, "dataMigrationsTracking", { enumerable: true, get: function () { return core_1.dataMigrationsTracking; } });
//# sourceMappingURL=index.js.map