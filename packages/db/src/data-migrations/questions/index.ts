/**
 * Data migrations for the 'questions' PostgreSQL schema
 */

import type { DataMigration } from '../types';
import { migration as demCharacteristics } from './0001_dem_characteristics';

const questionsMigrations: DataMigration[] = [
  demCharacteristics,
];

export default questionsMigrations;
export { questionsMigrations };