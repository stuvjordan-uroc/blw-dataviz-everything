import { config } from "dotenv";
import { execSync } from "child_process";
import { writeFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import type { DataMigrationConfig } from "../types/migrations";

config({ path: "../../../.env" });

/**
 * Discover all data migration configs from all schemas
 */
function discoverDataMigrationConfigs(): DataMigrationConfig[] {
  const schemasDir = path.join(__dirname, "../schemas");
  const configs: DataMigrationConfig[] = [];

  if (!existsSync(schemasDir)) {
    console.warn("No schemas directory found");
    return configs;
  }

  const schemaDirs = readdirSync(schemasDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const schemaName of schemaDirs) {
    const dataMigrationsPath = path.join(
      schemasDir,
      schemaName,
      "data-migrations"
    );

    if (existsSync(dataMigrationsPath)) {
      try {
        // Import the index file which re-exports all configs
        const configModule = require(dataMigrationsPath);

        // Get all exported configs (assumes they end with 'Config')
        Object.keys(configModule).forEach((key) => {
          if (key.endsWith("Config")) {
            configs.push(configModule[key]);
          }
        });
      } catch (error) {
        console.warn(
          `Failed to load data migrations from ${schemaName}:`,
          error
        );
      }
    }
  }

  return configs;
}

async function generateUnifiedMigration(migrationName?: string): Promise<void> {
  console.log("Generating unified migration...");

  // 1. Generate schema migration using drizzle-kit
  const schemaCommand = migrationName
    ? `npx drizzle-kit generate --name "${migrationName}"`
    : "npx drizzle-kit generate";

  try {
    execSync(schemaCommand, { stdio: "inherit" });
  } catch (error) {
    console.error("Failed to generate schema migration:", error);
    throw error;
  }

  // 2. Find the latest migration file
  const migrationsDir = path.join(__dirname, "../migrations");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort()
    .reverse();

  if (migrationFiles.length === 0) {
    throw new Error("No migration files found after generation");
  }

  const latestMigration = migrationFiles[0];
  const migrationBaseName = latestMigration.replace(".sql", "");

  // 3. Auto-discover all data migration configs
  const configs = discoverDataMigrationConfigs();

  if (configs.length === 0) {
    console.log(
      "No data migration configs found. Skipping data migration generation."
    );
    return;
  }

  // 4. Generate companion data migration file
  await generateDataMigration(migrationBaseName, configs);

  console.log(`Generated unified migration: ${migrationBaseName}`);
}

async function generateDataMigration(
  migrationName: string,
  configs: DataMigrationConfig[]
): Promise<void> {
  const dataMigrationPath = path.join(
    __dirname,
    "../migrations",
    `${migrationName}.ts`
  );

  // Group configs by schema for organized imports
  const configsBySchema = configs.reduce((acc, config) => {
    if (!acc[config.schemaName]) {
      acc[config.schemaName] = [];
    }
    acc[config.schemaName].push(config);
    return acc;
  }, {} as Record<string, DataMigrationConfig[]>);

  // Generate imports
  const configImports = Object.entries(configsBySchema)
    .map(([schemaName, schemaConfigs]) => {
      const configNames = schemaConfigs
        .map((c) => `${c.name}Config`)
        .join(", ");
      return `import { ${configNames} } from '../src/schemas/${schemaName}/data-migrations';`;
    })
    .join("\n");

  const tableImports = Object.entries(configsBySchema)
    .map(([schemaName, schemaConfigs]) => {
      const tableNames = [
        ...new Set(
          schemaConfigs.flatMap((c) => c.dataSources.map((s) => s.tableName))
        ),
      ].join(", ");
      return `import { ${tableNames} } from '../src/schemas/${schemaName}/schema';`;
    })
    .join("\n");

  const template = `// Data migration for ${migrationName}
// Generated on ${new Date().toISOString()}
import { db } from '../src/index';
${configImports}
import { batchInsert } from '../src/scripts/utils/parsers';
${tableImports}

// Table mapping for batch insert
const tableMap = {
${configs
  .flatMap((config) =>
    config.dataSources.map(
      (source) => `  '${source.tableName}': ${source.tableName}`
    )
  )
  .join(",\n")}
} as const;

export async function up(): Promise<void> {
  console.log('Running data migration: ${migrationName}');
  
${configs
  .map(
    (config) => `
  // Migrate ${config.name} data (schema: ${config.schemaName})
  try {
    for (const source of ${config.name}Config.dataSources) {
      console.log(\`Processing \${source.s3Key}...\`);
      const data = await source.transformer(source.s3Key);
      
      // Handle multiple tables from single source
      for (const [tableName, tableData] of Object.entries(data)) {
        if (Array.isArray(tableData) && tableData.length > 0) {
          const table = tableMap[tableName as keyof typeof tableMap];
          if (table) {
            await batchInsert(table, tableData);
            console.log(\`Successfully inserted \${tableData.length} records into \${tableName}\`);
          } else {
            console.warn(\`Table mapping not found for: \${tableName}\`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in ${config.name} data migration:', error);
    throw error;
  }`
  )
  .join("\n")}
  
  console.log('Data migration completed: ${migrationName}');
}

export async function down(): Promise<void> {
  console.log('Rolling back data migration: ${migrationName}');
  
  try {
${configs
  .map((config) => `    await ${config.name}Config.rollback();`)
  .join("\n")}
  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  }
  
  console.log('Data rollback completed: ${migrationName}');
}

// Auto-run if called directly
if (require.main === module) {
  const action = process.argv[2];
  if (action === 'down') {
    down().catch(console.error);
  } else {
    up().catch(console.error);
  }
}
`;

  writeFileSync(dataMigrationPath, template);
  console.log(`Generated data migration file: ${dataMigrationPath}`);
}

// CLI interface
const migrationName = process.argv[2];
generateUnifiedMigration(migrationName).catch(console.error);
