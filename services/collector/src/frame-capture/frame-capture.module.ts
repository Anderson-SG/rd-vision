import { Module } from '@nestjs/common';
import { FrameCaptureService } from './frame-capture.service';

@Module({
    imports: [],
    controllers: [],
    providers: [FrameCaptureService],
    exports: [FrameCaptureService],
})
export class FrameCaptureModule {}
