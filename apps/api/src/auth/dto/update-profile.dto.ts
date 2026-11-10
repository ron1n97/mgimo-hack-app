import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  course?: number;

  @IsOptional()
  @IsString()
  groupLabel?: string;

  @IsOptional()
  @IsString()
  groupRuzId?: string;

  /** Preferred RUZ language/stream subgroup oids within the academic group */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSubGroupOids?: string[];

  /** Phone for Telegram bot login — E.164 or RU local */
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
