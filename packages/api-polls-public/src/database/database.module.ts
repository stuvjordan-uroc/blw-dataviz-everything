import { Module, Global } from '@nestjs/common';
import { databaseProviders } from './database.providers';

/**
 * DatabaseModule provides database connection to the entire application
 * 
 * @Global() decorator makes this module available everywhere without needing
 * to import it in every module. This is useful for core services like database.
 * 
 * The module:
 * 1. Registers the database providers (connection setup)
 * 2. Exports them so other modules can inject the database
 */
@Global()
@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule { }
