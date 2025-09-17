import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import ffmpeg from 'fluent-ffmpeg';
import { firstValueFrom } from 'rxjs';

interface FramePayload {
  timestamp: string; // ISO
  data: string; // base64 jpeg
}

@Injectable()
export class FrameCaptureService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FrameCaptureService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) { }

  onModuleInit() {
    const enabled = this.isCaptureEnabled();
    if (!enabled) {
      this.logger.warn('Frame capture disabled via ENABLE_CAPTURE=false');
      return;
    }
    const everyMs = this.getIntervalMs();
    this.logger.log(`Starting frame capture every ${everyMs}ms`);
    this.interval = setInterval(() => this.captureAndSend().catch(err => this.logger.error(err)), everyMs);
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private async captureAndSend() {
  const device = this.getDevice();
  const processorUrl = this.config.get<string>('PROCESSOR_URL') || 'http://localhost:3001';

    // Capturar um frame único em JPEG usando ffmpeg
    const buffer = await this.captureSingleFrame(device);
    if (!buffer) return;

    const payload: FramePayload = {
      timestamp: new Date().toISOString(),
      data: buffer.toString('base64'),
    };

    try {
      await firstValueFrom(this.http.post(`${processorUrl}/frames`, payload));
      this.logger.debug(`Frame enviado (${(buffer.length / 1024).toFixed(1)}KB)`);
    } catch (e: any) {
      this.logger.error(`Falha ao enviar frame: ${e.message}`);
    }
  }

  private captureSingleFrame(device: string): Promise<Buffer | null> {
    // Usamos ffmpeg para capturar 1 frame
    return new Promise((resolve) => {
      let data: Buffer[] = [];
      // Dependendo da plataforma, input format pode variar. Assumindo v4l2 em Linux.
      ffmpeg()
        .input(device)
        .inputOptions(['-f v4l2'])
        .frames(1)
        .format('mjpeg')
        .on('error', (err: Error) => {
          this.logger.error(`Erro ffmpeg: ${err.message}`);
          resolve(null);
        })
        .on('end', () => {
          resolve(Buffer.concat(data));
        })
        .pipe() // retorna Readable stream
        .on('data', (chunk: Buffer) => data.push(chunk))
        .on('error', (err: Error) => {
          this.logger.error(`Stream erro: ${err.message}`);
          resolve(null);
        });
    });
  }

  // Helpers de configuração
  private isCaptureEnabled(): boolean {
    const raw = this.config.get<string>('ENABLE_CAPTURE', 'true')?.toLowerCase();
    return raw !== 'false' && raw !== '0';
  }

  private getIntervalMs(): number {
    const raw = this.config.get<string>('FRAME_INTERVAL_MS', '1000');
    let value = parseInt(raw, 10);
    if (Number.isNaN(value) || value < 100) {
      this.logger.warn(`FRAME_INTERVAL_MS inválido (${raw}), usando 1000`);
      value = 1000;
    }
    return value;
  }

  private getDevice(): string {
    return this.config.get<string>('WEBCAM_DEVICE', '/dev/video0');
  }
}
