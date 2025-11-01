import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

/**
 * ZodValidationPipe validates request data using Zod schemas
 * 
 * A Pipe in NestJS transforms or validates data before it reaches the controller method.
 * 
 * This pipe:
 * 1. Takes a Zod schema in its constructor
 * 2. Validates incoming data against that schema
 * 3. Throws BadRequestException if validation fails
 * 4. Returns the validated (and potentially transformed) data if successful
 * 
 * Usage in controllers:
 * @Body(new ZodValidationPipe(insertSessionSchema)) data: NewSession
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) { }

  transform(value: unknown) {
    try {
      // Parse and validate the value using the Zod schema
      const parsedValue = this.schema.parse(value);
      return parsedValue;
    } catch (error) {
      // If validation fails, throw a BadRequestException with details
      throw new BadRequestException({
        message: 'Validation failed',
        errors: error instanceof Error ? error.message : 'Unknown validation error',
      });
    }
  }
}
