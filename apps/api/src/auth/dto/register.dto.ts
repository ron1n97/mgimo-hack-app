import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role = Role.STUDENT;

  @IsString()
  fullName!: string;

  /** Optional — API fills defaults for contest demo signup */
  @IsOptional()
  @IsString()
  faculty?: string;

  @IsOptional()
  @IsString()
  program?: string;

  @IsOptional()
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

  @ValidateIf(
    (o: RegisterDto) =>
      o.role === Role.STAFF ||
      o.role === Role.ADMIN ||
      o.role === Role.TEACHER,
  )
  @IsOptional()
  @IsString()
  department?: string;
}
