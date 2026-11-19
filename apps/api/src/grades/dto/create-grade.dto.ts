import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @MinLength(1)
  studentUserId!: string;

  @IsString()
  @MinLength(1)
  scheduleLessonId!: string;

  @IsString()
  @MinLength(1)
  grade!: string;

  @IsString()
  @MinLength(1)
  gradeType!: string;

  @IsString()
  @MinLength(1)
  semester!: string;

  @IsOptional()
  @IsBoolean()
  isDebt?: boolean;
}
