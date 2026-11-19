import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Deanery edits to a student's academic identity (not self-service). */
export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  fullName?: string;

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSubGroupOids?: string[];
}
