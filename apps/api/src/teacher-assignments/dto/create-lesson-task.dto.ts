import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateLessonTaskDto {
  @IsString()
  @MinLength(1)
  assignmentId!: string;

  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(2)
  body!: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
