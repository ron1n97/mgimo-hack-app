import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class MarkMovedDto {
  @IsOptional()
  @IsBoolean()
  isMoved?: boolean;

  @IsOptional()
  @IsBoolean()
  isCancelled?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}
