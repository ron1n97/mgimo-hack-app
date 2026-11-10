import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateLessonTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  body?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string | null;
}
