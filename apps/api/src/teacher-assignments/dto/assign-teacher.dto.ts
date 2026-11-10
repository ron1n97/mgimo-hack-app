import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class AssignTeacherDto {
  @IsString()
  @MinLength(1)
  teacherUserId!: string;

  /** Specific ScheduleLesson id (preferred for a concrete slot). */
  @IsOptional()
  @IsString()
  scheduleLessonId?: string;

  /** Soft key: group + discipline series (when no concrete lesson). */
  @ValidateIf((o: AssignTeacherDto) => !o.scheduleLessonId)
  @IsString()
  @MinLength(1)
  groupRuzId?: string;

  @IsOptional()
  @IsString()
  groupLabel?: string;

  @ValidateIf((o: AssignTeacherDto) => !o.scheduleLessonId)
  @IsString()
  @MinLength(1)
  discipline?: string;
}
