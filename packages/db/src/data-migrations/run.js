#!/usr/bin/env tsx
"use strict";
/**
 * Run all pending data migrations
 *
 * Usage:
 *   npm run data:migrate              # Run all migrations
 *   npm run data:migrate questions    # Run only questions schema migrations
 *   npm run data:migrate responses    # Run only responses schema migrations
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const schemaArg = process.argv[2]; // e.g., 'questions' or 'responses'
async function main() {
    if (schemaArg) {
        const schemaMigrations = index_1.allMigrationsBySchema.find(s => s.schema === schemaArg);
        if (!schemaMigrations) {
            console.error(`❌ Unknown schema: ${schemaArg}`);
            console.log(`\nAvailable schemas: ${index_1.allMigrationsBySchema.map(s => s.schema).join(', ')}`);
            process.exit(1);
        }
        console.log(`Running data migrations for schema: ${schemaArg}\n`);
        console.log('Migrations to run:', schemaMigrations.migrations);
        await (0, index_1.runDataMigrations)(schemaMigrations.migrations);
    }
    else {
        console.log('Running all data migrations...\n');
        await (0, index_1.runDataMigrations)(index_1.allMigrations);
    }
    console.log('\n✅ Migration run complete');
    process.exit(0);
}
main().catch((error) => {
    console.error('\n❌ Error running data migrations:', error);
    process.exit(1);
});
//# sourceMappingURL=run.js.map