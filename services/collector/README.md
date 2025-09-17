<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

---

## Frame Capture (ffmpeg)

This service can capture a single JPEG frame periodically from a webcam or network stream using `ffmpeg`.

### Implementation Note

Atualmente a captura usa execução direta do binário `ffmpeg` (CLI) via `child_process.spawn`, não mais a API do `fluent-ffmpeg`, devido a inconsistências na detecção de `avfoundation` em macOS. Após validar em produção/local, a dependência `fluent-ffmpeg` poderá ser removida do `package.json` para reduzir superfície.

### Requirements

You must have a working `ffmpeg` binary in the container/host `PATH` with the appropriate input device demuxers:

- Linux: `v4l2`
- macOS: `avfoundation`
- Windows: `dshow`

Check available input formats:

```bash
ffmpeg -formats | grep -E 'v4l2|avfoundation|dshow'
```

List devices (examples):

```bash
# Linux (video devices)
ls /dev/video*

# macOS (list avfoundation devices)
ffmpeg -f avfoundation -list_devices true -i ''

# Windows (list DirectShow devices)
ffmpeg -list_devices true -f dshow -i dummy
```

### Environment Variables

| Variable | Description | Default (by platform) |
|----------|-------------|------------------------|
| `ENABLE_CAPTURE` | Disable/enable frame capture | `true` |
| `FRAME_INTERVAL_MS` | Interval between captures | `1000` |
| `WEBCAM_DEVICE` | Device index/path (e.g. `0`, `/dev/video0`) | Linux: `/dev/video0`, macOS: `0`, Windows: `0` |
| `FRAME_INPUT_FORMAT` | Force input format (`v4l2`, `avfoundation`, `dshow`) | Auto-detected |
| `FRAME_WIDTH` / `FRAME_HEIGHT` | Optional resolution hint for `v4l2` | unset |
| `FFMPEG_PATH` | Absolute path to ffmpeg binary to override PATH | system `ffmpeg` |
| `FRAME_FPS` | Desired capture framerate (device negotiation) | device default |
| `FRAME_PIXEL_FORMAT` | Pixel format (e.g. `uyvy422`, `yuyv422`, `nv12`) for avfoundation | unset |

Auto-detection logic (somente dispositivo local):

1. Manual override via `FRAME_INPUT_FORMAT`.
2. Caminho `/dev/video*` -> `v4l2`.
3. macOS valor numérico (`0` ou `0:1`) -> `avfoundation`.
4. Windows -> `dshow`.

### Examples

Linux USB cam:
```bash
ENABLE_CAPTURE=true \
WEBCAM_DEVICE=/dev/video0 \
FRAME_INTERVAL_MS=1000 pnpm run start:dev
```

macOS built-in camera:
```bash
ENABLE_CAPTURE=true \
WEBCAM_DEVICE=0 \
FRAME_INTERVAL_MS=1500 pnpm run start:dev
```

Force format (if auto-detect fails):
```bash
FRAME_INPUT_FORMAT=avfoundation WEBCAM_DEVICE=0 pnpm run start:dev
```

### Troubleshooting

Error: `Input format v4l2 is not available` on macOS:
- Set `FRAME_INPUT_FORMAT=avfoundation` and `WEBCAM_DEVICE=0`.
- Confirm ffmpeg has avfoundation: `ffmpeg -formats | grep avfoundation`.

Error: `Input format avfoundation is not available` even though `ffmpeg -formats` shows it:
- Node process may be using another ffmpeg in PATH (older build). Run `which ffmpeg` inside the service context.
- Force binary: `FFMPEG_PATH=$(which ffmpeg) pnpm run start:dev`.
- Ensure Homebrew ffmpeg install includes avfoundation (it usually does by default).

Error: `No such file or directory` referencing `/dev/video0`:
- Device path incorrect or permissions (Linux). Check `ls -l /dev/video*`.

Low quality / wrong resolution:
- Provide `FRAME_WIDTH` and `FRAME_HEIGHT` (Linux v4l2 only). Example: `FRAME_WIDTH=1280 FRAME_HEIGHT=720`.

Verbose ffmpeg logging (temporary): modify log level in code or add extra `.on('stderr')` filtering.

### macOS (avfoundation) notas

Se você ver:
```
Selected framerate (29.970030) is not supported by the device.
Supported modes:
  1920x1080@[15.000000 30.000000]fps
  1280x720@[15.000000 30.000000]fps
  ...
```
Defina um FPS suportado (ex: 30 ou 15) e, opcionalmente, a resolução:
```bash
FRAME_INPUT_FORMAT=avfoundation \
WEBCAM_DEVICE=0 \
FRAME_FPS=30 \
FRAME_WIDTH=1280 FRAME_HEIGHT=720 pnpm run start:dev
```
Se ainda falhar, tente outro pixel format (ex: `FRAME_PIXEL_FORMAT=uyvy422`). Liste modos e formatos com:
```bash
ffmpeg -f avfoundation -list_devices true -i ''
```

---
