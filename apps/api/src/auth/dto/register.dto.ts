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

  @ValidateIf((o: RegisterDto) => (o.role ?? Role.STUDENT) === Role.STUDENT)
  @IsString()
  faculty?: string;

  @ValidateIf((o: RegisterDto) => (o.role ?? Role.STUDENT) === Role.STUDENT)
  @IsString()
  program?: string;

  @ValidateIf((o: RegisterDto) => (o.role ?? Role.STUDENT) === Role.STUDENT)
  @IsInt()
  @Min(1)
  @Max(6)
  course?: number;

  @ValidateIf((o: RegisterDto) => (o.role ?? Role.STUDENT) === Role.STUDENT)
  @IsString()
  groupLabel?: string;

  @IsOptional()
  @IsString()
  groupRuzId?: string;

  @ValidateIf((o: RegisterDto) => o.role === Role.STAFF || o.role === Role.ADMIN)
  @IsString()
  department?: string;
}
