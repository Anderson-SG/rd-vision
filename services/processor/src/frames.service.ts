import { Injectable, Logger } from '@nestjs/common';
import { FrameDto } from './dto/frame.dto';

@Injectable()
export class FramesService {
  private readonly logger = new Logger(FramesService.name);

  handleFrame(frame: FrameDto) {
    const sizeKb = (Buffer.byteLength(frame.data, 'base64') / 1024).toFixed(1);
    this.logger.log(`Frame @ ${frame.timestamp} size=${sizeKb}KB`);
  }

  handleFrameBuffer(timestamp: string, buffer: Buffer) {
    const sizeKb = (buffer.byteLength / 1024).toFixed(1);
    this.logger.log(`Frame(multipart) @ ${timestamp} size=${sizeKb}KB`);
  }
}
