import { Module } from "@nestjs/common";
import { ResponsesController } from "./responses.controller";
import { ResponsesService } from "./responses.service";

/**
 * ResponsesModule organizes the responses feature
 *
 * This module:
 * - Provides ResponsesService for business logic
 * - Exposes ResponsesController for HTTP endpoints
 */
@Module({
  controllers: [ResponsesController],
  providers: [ResponsesService],
})
export class ResponsesModule {}
