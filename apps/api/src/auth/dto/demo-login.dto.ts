import { IsString, MinLength } from 'class-validator';

export class DemoLoginDto {
  @IsString()
  @MinLength(1)
  personaId!: string;
}
