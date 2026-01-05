import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class KeyResolutionParamsDto {
  @IsNotEmpty({ message: 'Key value cannot be empty' })
  @IsString({ message: 'Key must be a string' })
  @MinLength(1, { message: 'Key must be at least 1 character' })
  @MaxLength(92, { message: 'Key must not exceed 92 characters (max email length)' })
  key: string;
}
