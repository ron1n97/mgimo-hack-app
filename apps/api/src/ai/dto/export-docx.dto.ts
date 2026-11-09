import { IsOptional, IsString, MinLength } from 'class-validator';

export class ExportDocxDto {
  @IsString()
  @MinLength(1)
  type!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
