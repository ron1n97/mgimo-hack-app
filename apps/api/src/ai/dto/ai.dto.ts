import { IsOptional, IsString, MinLength } from 'class-validator';

export class DraftRequestDto {
  @IsString()
  @MinLength(1)
  type!: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class NextActionsDto {
  @IsOptional()
  @IsString()
  focus?: string;
}

export class ExplainNotificationDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  body!: string;

  @IsOptional()
  @IsString()
  kind?: string;
}
