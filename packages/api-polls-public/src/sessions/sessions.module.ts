import { Module } from "@nestjs/common";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";
import { ResponsesModule } from "../responses/responses.module";

/**
 * SessionsModule provides session information retrieval for public clients
 * 
 * This module handles the main entry point for clients connecting to sessions.
 * It depends on ResponsesModule to get current visualization state.
 */
@Module({
  imports: [ResponsesModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule { }
