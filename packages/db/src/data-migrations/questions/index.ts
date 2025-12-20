/**
 * Data migrations for the 'questions' PostgreSQL schema
 */

import type { DataMigration } from '../types';
import { migration as demCharacteristics } from './0001_dem_characteristics';

const questionsMigrations: DataMigration[] = [];

// Skip demographic characteristics data migration in test environment
// This migration fetches large data from S3 which is slow and unnecessary for tests
if (process.env.NODE_ENV !== 'test' && !process.env.TEST_DATABASE_URL) {
  questionsMigrations.push(demCharacteristics);
}

export default questionsMigrations;
export { questionsMigrations };