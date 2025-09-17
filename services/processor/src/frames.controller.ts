import { Body, Controller, Post } from '@nestjs/common';
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
}
