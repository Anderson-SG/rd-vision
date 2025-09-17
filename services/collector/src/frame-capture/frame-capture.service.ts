import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { spawn, spawnSync } from 'child_process';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

interface FramePayload {
  timestamp: string; // ISO
  data: string; // base64 jpeg
}

@Injectable()
export class FrameCaptureService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FrameCaptureService.name);
  private interval?: NodeJS.Timeout;
  private consecutiveFailures = 0;
  private probedFormats: Set<string> | null = null;
  private resolvedFfmpegPath: string = 'ffmpeg';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const enabled = this.isCaptureEnabled();
    if (!enabled) {
      this.logger.warn('Frame capture disabled via ENABLE_CAPTURE=false');
      return;
    }
    const everyMs = this.getIntervalMs();
    this.initializeFfmpegAndLog(everyMs);
    this.interval = setInterval(() =>
      this.captureAndSend().catch(err => this.logger.error(err)), everyMs);
  }

  private initializeFfmpegAndLog(everyMs: number) {
    // Set ffmpeg path if provided
    const customFfmpegPath = this.config.get<string>('FFMPEG_PATH');
    if (customFfmpegPath) {
      this.resolvedFfmpegPath = customFfmpegPath;
      this.logger.log(`Usando FFMPEG_PATH='${customFfmpegPath}'`);
    }
    const source = this.getSource();
    const inputFormat = this.getInputFormat(source);
    const deviceHint = this.config.get<string>('WEBCAM_DEVICE');
    const explicitFormat = this.config.get<string>('FRAME_INPUT_FORMAT');
    this.logger.log(`Frame capture starting every ${everyMs}ms | source='${source}' | format='${inputFormat}'` + (explicitFormat ? ' (explicit)' : '') + (deviceHint ? ` deviceHint='${deviceHint}'` : ''));
    this.logger.debug(`Runtime platform=${process.platform} arch=${process.arch}`);
    this.probeFormats();
    if (inputFormat && this.probedFormats && !this.probedFormats.has(inputFormat)) {
      this.logger.error(`Formato '${inputFormat}' não encontrado em 'ffmpeg -formats'.`);
      if (process.platform === 'darwin' && inputFormat === 'avfoundation') this.logger.warn('brew install ffmpeg  (garanta suporte avfoundation)');
      if (process.platform === 'linux' && inputFormat === 'v4l2') this.logger.warn('apt install ffmpeg  (ou equivalente)');
    }
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  private async captureAndSend() {
    const source = this.getSource();
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
      const processorUrl = this.config.get<string>('PROCESSOR_URL');
      if (!processorUrl) {
        this.logger.warn('PROCESSOR_URL não definido, pulando envio de frame');
        return;
      }
      // Placeholder: sending disabled intentionally. Uncomment when endpoint available.
      await firstValueFrom(this.http.post(`${processorUrl}/frames/multipart`, form, { headers: form.getHeaders(), maxBodyLength: Infinity }));
      this.logger.debug(
        `Frame capturado (${(buffer.length / 1024).toFixed(1)}KB)`,
      );
      this.consecutiveFailures = 0;
    } catch (e: any) {
      this.handleFailure(`Falha ao enviar frame multipart: ${e.message}`);
    }
  }

  private captureSingleFrame(source: string): Promise<Buffer | null> {
    return this.tryCapture(source, true);
  }

  private async tryCapture(source: string, allowFallback: boolean): Promise<Buffer | null> {
    const inputFormat = this.getInputFormat(source);
    const args = this.buildFfmpegArgs(source, inputFormat);
    this.logger.log(`ffmpeg start: ${this.resolvedFfmpegPath} ${args.join(' ')}`);
    return new Promise(resolve => {
      const proc = spawn(this.resolvedFfmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      const chunks: Buffer[] = [];
      let stderr = '';
      proc.stdout.on('data', d => chunks.push(d));
      proc.stderr.on('data', d => {
        const text = d.toString();
        stderr += text;
        this.handleCliStderrLines(text, inputFormat, source);
      });
      proc.on('error', err => {
        this.logger.error(`Falha ao iniciar ffmpeg: ${err.message}`);
        resolve(null);
      });
      proc.on('close', code => {
        if (code === 0 && chunks.length) {
          return resolve(Buffer.concat(chunks));
        }
        if (allowFallback && inputFormat === 'avfoundation' && /Input format avfoundation is not available/i.test(stderr)) {
          this.logger.warn('Fallback: tentando novamente sem -f avfoundation');
          return this.tryCapture(source, false).then(resolve);
        }
        if (/Selected framerate .* is not supported/i.test(stderr) && allowFallback) {
          this.logger.warn('Fallback: removendo FRAME_FPS e FRAME_PIXEL_FORMAT e tentando novamente');
          return this.tryCapture(source, false).then(resolve);
        }
        this.logger.error(`ffmpeg exit code ${code}. stderr principal:
${stderr.split('\n').slice(-15).join('\n')}`);
        resolve(null);
      });
    });
  }

  private buildFfmpegArgs(source: string, inputFormat?: string): string[] {
    const args: string[] = [];
    // formato explícito
    if (inputFormat) args.push('-f', inputFormat);
    const { width, height, fps, pixelFormat } = this.buildCommonValues();
    if (fps) args.push('-framerate', fps);
    if (pixelFormat) args.push('-pixel_format', pixelFormat);
    if (width && height) args.push('-video_size', `${width}x${height}`);
    // input
    args.push('-i', source);
    // Um frame JPEG na saída stdout
    args.push('-frames:v', '1', '-qscale:v', '2', '-f', 'mjpeg', 'pipe:1');
    return args;
  }

  private buildCommonValues() {
    return {
      width: this.config.get<string>('FRAME_WIDTH'),
      height: this.config.get<string>('FRAME_HEIGHT'),
      fps: this.config.get<string>('FRAME_FPS'),
      pixelFormat: this.config.get<string>('FRAME_PIXEL_FORMAT'),
    };
  }

  // (Mantivemos buildCommonValues para args.)

  private handleCliStderrLines(chunk: string, inputFormat: string | undefined, source: string) {
    for (const line of chunk.split(/\r?\n/)) {
      if (!line) continue;
      if (/Input format .* not available/i.test(line)) {
        this.logger.error(`Formato indisponível '${inputFormat}': ${line}`);
      } else if (/No such file or directory/i.test(line)) {
        this.logger.error(`Dispositivo inexistente '${source}'`);
      } else if (/Selected framerate .* is not supported/i.test(line)) {
        this.logger.warn('Framerate não suportado. Ajustar FRAME_FPS (ex: 30 ou 15).');
      } else if (/Supported modes:/i.test(line)) {
        this.logger.debug('Modos suportados listados a seguir (avfoundation).');
      }
      this.logger.verbose?.(line);
    }
  }

  private suggestFormatFix(_inputFormat?: string) { /* Simplified / no-op for CLI version */ }

  // Helpers de configuração
  private isCaptureEnabled(): boolean {
    const raw = this.config
      .get<string>('ENABLE_CAPTURE', 'true')
      ?.toLowerCase();
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
    // Apenas dispositivo local (sem URLs). WEBCAM_DEVICE tem precedência.
    const device = this.config.get<string>('WEBCAM_DEVICE');
    if (device) return this.normalizeDevice(device);
    if (process.platform === 'linux') return '/dev/video0';
    if (process.platform === 'darwin') return '0';
    if (process.platform === 'win32') return '0';
    return '/dev/video0';
  }

  private normalizeDevice(value: string): string {
    // macOS: permitir número simples ou par video:audio
    if (process.platform === 'darwin') {
      if (/^\d(:\d)?$/.test(value)) return value; // já está no formato esperado
      // Se for fornecido como '0,1' converter para '0:1'
      if (/^\d,\d$/.test(value)) return value.replace(',', ':');
    }
    return value; // Linux/Windows ficam como estão
  }

  private getInputFormat(source: string): string | undefined {
    const manual = this.config.get<string>('FRAME_INPUT_FORMAT');
    if (manual) return manual;
    if (source.startsWith('/dev/video')) return 'v4l2';
    if (process.platform === 'darwin' && /^\d(:\d)?$/.test(source)) return 'avfoundation';
    if (process.platform === 'win32') return 'dshow';
    return undefined;
  }

  private probeFormats() {
    if (this.probedFormats) return; // já feito
    try {
  const ff = spawnSync(this.resolvedFfmpegPath, ['-hide_banner', '-formats'], { encoding: 'utf-8' });
      if (ff.error) {
        this.logger.warn(`Não foi possível executar ffmpeg para detectar formatos: ${ff.error.message}`);
        return;
      }
      const out = ff.stdout + ff.stderr; // alguns builds imprimem em stderr
      const set = new Set<string>();
      // linhas possuem: ' DE ai      AIFC Audio Interchange File Format (AIFF-C)' ou ' D  avfoundation    AVFoundation input device'
      for (const line of out.split(/\r?\n/)) {
        const m = line.match(/\b([a-z0-9_]{3,})\b\s+/i);
        if (m) set.add(m[1]);
      }
      this.probedFormats = set;
      this.logger.debug(`Formatos ffmpeg detectados: ${set.size}`);
    } catch (err: any) {
      this.logger.warn(`Falha ao detectar formatos ffmpeg: ${err.message}`);
    }
  }

  // Preflight removido – não há suporte a URLs agora.

  private handleFailure(message: string) {
    this.consecutiveFailures++;
    this.logger.error(message);
    // Mensagens relacionadas a streaming removidas.
  }
}
