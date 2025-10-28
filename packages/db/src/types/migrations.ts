export interface DataMigrationConfig {
  name: string;
  schemaName: string;
  dataSources: Array<{
    s3Key: string;
    tableName: string;
    transformer: (s3Key: string) => Promise<TableRowsMap>;
  }>;
  rollback: () => Promise<void>;
}
export type TableRowsMap = Record<TableName, TableRows>;
export type TableName = string;
export type TableRows = unknown[];
