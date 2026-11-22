import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class ConfirmClubDto {
  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;
}

export class DigestToggleDto {
  @IsBoolean()
  digestEnabled!: boolean;
}

export class CreateDigestSourceDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class StaffCreateClubDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: false }, { each: true })
  sourceUrls?: string[];

  @IsOptional()
  @IsBoolean()
  digestEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmed?: boolean;
}

export class ModerateEventDto {
  @IsOptional()
  @IsString()
  status?: 'APPROVED' | 'REJECTED' | 'PENDING';

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  body?: string;

  /** ISO datetime or empty string to clear. */
  @IsOptional()
  @IsString()
  startsAt?: string | null;
}

export class SetTagSubscriptionsDto {
  @IsArray()
  @IsString({ each: true })
  tagIds!: string[];
}
