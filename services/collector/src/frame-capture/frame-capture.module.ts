import { Module } from '@nestjs/common';
import { FrameCaptureService } from './frame-capture.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [HttpModule.register({ timeout: 5000 })],
    controllers: [],
    providers: [FrameCaptureService],
    exports: [FrameCaptureService],
})
export class FrameCaptureModule {}
