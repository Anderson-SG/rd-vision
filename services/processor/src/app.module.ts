import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FramesController } from './frames.controller.js';
import { FramesService } from './frames.service.js';

@Module({
  imports: [],
  controllers: [AppController, FramesController],
  providers: [AppService, FramesService],
})
export class AppModule {}
