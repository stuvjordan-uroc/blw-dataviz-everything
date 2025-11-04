import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * AllExceptionsFilter catches all exceptions in the application
 * 
 * @Catch() without arguments means it catches ALL exceptions
 * 
 * This filter provides consistent error responses with:
 * - Proper HTTP status codes
 * - Error messages
 * - Timestamp and path information
 * 
 * It handles:
 * - HttpException (thrown by NestJS - NotFoundException, BadRequestException, etc.)
 * - Database errors
 * - Any other unexpected errors
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Log the full exception for debugging
    console.error('🚨 Exception caught:', exception);
    if (exception instanceof Error) {
      console.error('Stack trace:', exception.stack);
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = undefined;

    // If it's a NestJS HttpException (NotFoundException, BadRequestException, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        errors = responseObj.errors;
      }
    }
    // Handle database errors
    else if (exception instanceof Error) {
      message = exception.message;

      // Check for specific database errors
      if (message.includes('violates foreign key constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid reference: Related record does not exist';
      } else if (message.includes('duplicate key')) {
        status = HttpStatus.CONFLICT;
        message = 'Record already exists';
      } else if (message.includes('violates not-null constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Required field is missing';
      }
    }

    // Send the error response
    response.status(status).json({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
