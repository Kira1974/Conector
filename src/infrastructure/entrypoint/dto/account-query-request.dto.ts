import { IsNotEmpty, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AccountDto {
  @IsNotEmpty({ message: 'Account type cannot be empty' })
  @IsString({ message: 'Account type must be a string' })
  type: string;

  @IsNotEmpty({ message: 'Account value cannot be empty' })
  @IsString({ message: 'Account value must be a string' })
  @MinLength(1)
  @MaxLength(92)
  value: string;
}

export class AccountQueryRequestDto {
  @ValidateNested()
  @Type(() => AccountDto)
  @IsNotEmpty({ message: 'Account cannot be empty' })
  account: AccountDto;
}
