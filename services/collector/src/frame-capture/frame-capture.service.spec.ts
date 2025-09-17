import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { FrameCaptureService } from './frame-capture.service';

// We only want to access the private helpers via casting for unit validation

function makeService(env: Record<string, string | undefined>) {
  const config = {
    get: <T = string>(key: string): any => env[key],
  } as unknown as ConfigService;
  const http = {} as HttpService;
  return new FrameCaptureService(http, config);
}

describe('FrameCaptureService input format detection', () => {
  it('detects v4l2 for /dev/video* path', () => {
    const svc = makeService({});
    // @ts-ignore
    const fmt = svc.getInputFormat('/dev/video0');
    expect(fmt).toBe('v4l2');
  });

  it('detects avfoundation only on macOS numeric device', () => {
    const svc = makeService({});
    // @ts-ignore
    const fmt = svc.getInputFormat('0');
    if (process.platform === 'darwin') {
      expect(fmt).toBe('avfoundation');
    } else {
      expect(fmt).toBeUndefined();
    }
  });

  it('respects manual override', () => {
    const svc = makeService({ FRAME_INPUT_FORMAT: 'dshow' });
    // @ts-ignore
    const fmt = svc.getInputFormat('anything');
    expect(fmt).toBe('dshow');
  });
});
