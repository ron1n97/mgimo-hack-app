import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class SolveTimetableDto {
  @IsArray()
  @IsString({ each: true })
  groupRuzIds!: string[];

  @IsString()
  from!: string; // YYYY-MM-DD

  @IsString()
  to!: string;

  @IsOptional()
  @IsIn(['auto', 'cpsat', 'heuristic'])
  engine?: 'auto' | 'cpsat' | 'heuristic';
}
