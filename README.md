# rd-vision

Microserviços para coleta (collector) e processamento (processor) de frames de vídeo.

## Streaming de webcam simplificado (1 frame/seg)

O serviço `collector` captura 1 frame da webcam local (Linux `/dev/video0`) a cada segundo usando `ffmpeg` e envia via HTTP para o serviço `processor`, que apenas loga informações básicas do frame.

### Pré-requisitos

- Node.js + pnpm
- ffmpeg instalado e acessível no PATH
- Acesso a um dispositivo de vídeo (`/dev/video0`) em Linux

### Variáveis de ambiente principais

| Variável | Default | Descrição |
|----------|---------|-----------|
| `PROCESSOR_URL` | `http://localhost:3001` | URL base do microserviço processor |
| `WEBCAM_DEVICE` | `/dev/video0` | Dispositivo de captura v4l2 |
| `FRAME_INTERVAL_MS` | `1000` | Intervalo entre capturas em ms |
| `ENABLE_CAPTURE` | `true` | Define se a captura é ativada |

### Passos para rodar localmente

Abra dois terminais:

Terminal 1 (processor):

```bash
cd services/processor
pnpm install
pnpm start:dev
```

Terminal 2 (collector):

```bash
cd services/collector
pnpm install
export PROCESSOR_URL=http://localhost:3001
export WEBCAM_DEVICE=/dev/video0
export FRAME_INTERVAL_MS=1000
pnpm start:dev
```

Você deverá ver no terminal do `processor` logs como:

```text
[FramesService] Frame @ 2025-09-17T12:00:00.000Z size=42.3KB
```

### Desativar captura

Defina `ENABLE_CAPTURE=false` antes de iniciar o collector se quiser iniciar sem capturar/mandar frames.

### Notas

- Este fluxo envia a imagem completa em Base64 via JSON; para produção considere formatos binários (multipart, gRPC streaming, WebSocket) e compressão.
- Ajuste opções do ffmpeg no `FrameCaptureService` caso precise de resolução / qualidade específicas.

### Performance: Base64 vs Multipart

Agora há suporte a envio multipart (padrão) definindo `FRAME_TRANSPORT` (default `multipart`).

Comparação:

| Método | Overhead | Simplicidade | Comentário |
|--------|----------|--------------|------------|
| JSON + Base64 | ~33% tamanho extra | Muito simples | Evitar para alta taxa de frames |
| Multipart/form-data | Pequeno (boundary) | Simples | Binário direto, melhor uso de memória |
| Raw octet-stream | Mínimo | Médio | Precisaria headers custom, pode ser próximo passo |
| WebSocket/gRPC stream | Baixo após handshake | Maior | Bom para tempo real e controle de fluxo |

Envio JSON legado permanece disponível com `FRAME_TRANSPORT=json-base64`.

### Próximos passos sugeridos

- Implementar fila (ex: Redis, NATS) para desacoplar captura e processamento.
- Adicionar métricas de throughput e latência.
- Suporte a múltiplas câmeras / sessão.
- Persistência temporária dos frames para debugging.

