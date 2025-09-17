import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FrameDto } from './dto/frame.dto';
import { FramesService } from './frames.service';

@Controller('frames')
export class FramesController {
  constructor(private readonly framesService: FramesService) {}

  @Post()
  receiveFrame(@Body() frame: FrameDto) {
    this.framesService.handleFrame(frame);
    return { status: 'ok' };
  }

  @Post('multipart')
  @UseInterceptors(FileInterceptor('frame'))
  receiveFrameMultipart(
    @UploadedFile() file: any,
    @Body('timestamp') timestamp?: string,
  ) {
    if (!file || !file.buffer) {
      return { status: 'error', message: 'Missing file field "frame"' };
    }
    const ts = timestamp || new Date().toISOString();
    this.framesService.handleFrameBuffer(ts, file.buffer);
    return { status: 'ok' };
  }
}
