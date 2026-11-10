import { IsArray, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  structureNote?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  websiteUrl?: string;

  /** Tag names or slugs; created if missing */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  sourceUrls?: string[];
}
