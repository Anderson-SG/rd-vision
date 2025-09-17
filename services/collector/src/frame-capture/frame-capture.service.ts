import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import ffmpeg from 'fluent-ffmpeg';
import { firstValueFrom } from 'rxjs';
import FormData from 'form-data';

interface FramePayload {
  timestamp: string; // ISO
  data: string; // base64 jpeg
}

@Injectable()
export class FrameCaptureService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FrameCaptureService.name);
  private interval?: NodeJS.Timeout;
  private consecutiveFailures = 0;

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
    const source = this.getSource();
    const processorUrl = this.config.get<string>('PROCESSOR_URL') || 'http://localhost:3001';

    // Capturar um frame único em JPEG usando ffmpeg
    // Preflight se for URL HTTP
    if (source.startsWith('http')) {
      const ok = await this.preflightHttp(source);
      if (!ok) {
        this.handleFailure(`Preflight falhou para ${source}`);
        return;
      }
    }

    const buffer = await this.captureSingleFrame(source);
    if (!buffer) return;

    const timestamp = new Date().toISOString();

    // Default multipart
    const form = new FormData();

    form.append('frame', buffer, {
      filename: `${timestamp}.jpg`,
      contentType: 'image/jpeg',
      knownLength: buffer.length,
    });

    form.append('timestamp', timestamp);
    try {
      // await firstValueFrom(this.http.post(`${processorUrl}/frames/multipart`, form, {
      //   headers: form.getHeaders(),
      //   maxBodyLength: Infinity,
      // }));
      this.logger.debug(`Frame enviado multipart (${(buffer.length / 1024).toFixed(1)}KB)`);
      this.consecutiveFailures = 0;
    } catch (e: any) {
      this.handleFailure(`Falha ao enviar frame multipart: ${e.message}`);
    }
  }

  private captureSingleFrame(source: string): Promise<Buffer | null> {
    // Usamos ffmpeg para capturar 1 frame
    return new Promise((resolve) => {
      let data: Buffer[] = [];
      // Dependendo da plataforma, input format pode variar. Assumindo v4l2 em Linux.
      const chain = ffmpeg().input(source);
      if (source.startsWith('/dev/video')) {
        chain.inputOptions(['-f v4l2']);
      }
      chain
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

  private getSource(): string {
    const url = this.config.get<string>('FRAME_SOURCE_URL');
    if (url) {
      this.logger.debug(`Usando FRAME_SOURCE_URL=${url}`);
      return url;
    }
    return this.config.get<string>('WEBCAM_DEVICE', '/dev/video0');
  }

  // Preflight HTTP simples para detectar conexão recusada antes de invocar ffmpeg
  private async preflightHttp(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(url, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        this.logger.warn(`Preflight HTTP status ${res.status} para ${url}`);
      }
      return true; // mesmo status não 200 deixamos ffmpeg tentar (pode ser stream que não responde OK)
    } catch (err: any) {
      this.logger.error(`Preflight erro: ${err.message}`);
      return false;
    }
  }

  private handleFailure(message: string) {
    this.consecutiveFailures++;
    this.logger.error(message);
    if (this.consecutiveFailures === 3) {
      this.logger.warn('3 falhas consecutivas. Verifique se o VLC está servindo a URL e acessível do WSL.');
      this.logger.warn('Dica VLC: Media > Stream > selecione dispositivo > Configure destino HTTP porta 8080, path /live, sem autenticação, formato MJPEG ou H264.');
      this.logger.warn('No WSL, tente: curl -v http://localhost:8080/live para validar acesso direto.');
    }
  }
}
