import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FrameCaptureModule } from './frame-capture/frame-capture.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({ timeout: 5000 }), FrameCaptureModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
