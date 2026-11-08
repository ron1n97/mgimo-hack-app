import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @MinLength(1)
  type!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  aiDraft?: string;
}
