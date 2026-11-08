import { IsOptional, IsString, MinLength } from 'class-validator';

export class LoginPhoneDto {
  @IsString()
  @MinLength(5)
  phone!: string;

  /** Telegram user id — stored on successful match */
  @IsOptional()
  @IsString()
  telegramId?: string;
}
