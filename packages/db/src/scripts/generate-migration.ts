import { config } from 'dotenv';
import { execSync } from 'child_process';
import { writeFileSync, readdirSync } from 'fs';
import path from 'path';
import { questionsMigrationConfig } from '../schema/questions';
// Import other schema migration configs here as you add them...

config({ path: '../../../.env' });

interface MigrationConfig {
  name: string;
  dataSources: Array<{
    s3Key: string;
    target: string;
    transformer: (s3Key: string) => Promise<Record<string, unknown[]>>;
  }>;
  rollback: () => Promise<void>;
}

async function generateUnifiedMigration(migrationName?: string): Promise<void> {
  console.log('Generating unified migration...');

  // 1. Generate schema migration using drizzle-kit
  const schemaCommand = migrationName
    ? `npx drizzle-kit generate --name "${migrationName}"`
    : 'npx drizzle-kit generate';

  try {
    execSync(schemaCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to generate schema migration:', error);
    throw error;
  }

  // 2. Find the latest migration file
  const migrationsDir = path.join(__dirname, '../migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort()
    .reverse();

  if (migrationFiles.length === 0) {
    throw new Error('No migration files found after generation');
  }

  const latestMigration = migrationFiles[0];
  const migrationBaseName = latestMigration.replace('.sql', '');

  // 3. Generate companion data migration file
  await generateDataMigration(migrationBaseName, [
    questionsMigrationConfig,
    // Add other migration configs here as you create them...
  ]);

  console.log(`Generated unified migration: ${migrationBaseName}`);
}

async function generateDataMigration(migrationName: string, configs: MigrationConfig[]): Promise<void> {
  const dataMigrationPath = path.join(__dirname, '../migrations', `${migrationName}.ts`);

  const template = `// Data migration for ${migrationName}
// Generated on ${new Date().toISOString()}
import { db } from '../src/index';
import { ${configs.map(config => `${config.name}MigrationConfig`).join(', ')} } from '../src/schema/questions';
import { batchInsert } from '../src/scripts/utils/parsers';
import { ${configs.flatMap(config =>
    config.dataSources.map(source => source.target)
  ).join(', ')} } from '../src/schema/questions';

// Table mapping for batch insert
const tableMap = {
${configs.flatMap(config =>
    config.dataSources.map(source => `  '${source.target}': ${source.target}`)
  ).join(',\n')}
} as const;

export async function up(): Promise<void> {
  console.log('Running data migration: ${migrationName}');
  
${configs.map(config => `
  // Migrate ${config.name} data
  try {
    for (const source of ${config.name}MigrationConfig.dataSources) {
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
  }`).join('\n')}
  
  console.log('Data migration completed: ${migrationName}');
}

export async function down(): Promise<void> {
  console.log('Rolling back data migration: ${migrationName}');
  
  try {
${configs.map(config => `    await ${config.name}MigrationConfig.rollback();`).join('\n')}
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