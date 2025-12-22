import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ResponsesController } from "./responses.controller";
import { ResponsesService } from "./responses.service";
import { VisualizationCacheService } from "./visualization-cache.service";
import { ResponseTransformer } from "./response-transformer.service";
import { BatchUpdateScheduler, BATCH_INTERVAL_TOKEN } from "./batch-update-scheduler.service";
import { VisualizationStreamService } from "./visualization-stream.service";
import { VisualizationStreamController } from "./visualization-stream.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [ResponsesController, VisualizationStreamController],
  providers: [
    {
      provide: BATCH_INTERVAL_TOKEN,
      useValue: parseInt(process.env.BATCH_UPDATE_INTERVAL_MS || '3000', 10),
    },
    ResponsesService,
    VisualizationCacheService,
    ResponseTransformer,
    BatchUpdateScheduler,
    VisualizationStreamService,
  ],
  exports: [ResponsesService, VisualizationCacheService, BatchUpdateScheduler],
})
export class ResponsesModule { }
