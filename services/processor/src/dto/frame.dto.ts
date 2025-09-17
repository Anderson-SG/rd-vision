import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';

export class FrameDto {
  @IsISO8601()
  timestamp!: string; // ISO string

  @IsString()
  @IsNotEmpty()
  data!: string; // base64 image data (e.g., JPEG)
}
