import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AnnounceDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  body!: string;

  @IsOptional()
  @IsIn(['deanery_announce', 'schedule_moved', 'digest_morning'])
  kind?: 'deanery_announce' | 'schedule_moved' | 'digest_morning';
}
