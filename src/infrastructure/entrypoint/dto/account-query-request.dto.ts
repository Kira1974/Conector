import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AccountDto {
  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsString()
  value: string;
}

export class AccountQueryRequestDto {
  @ValidateNested()
  @Type(() => AccountDto)
  @IsNotEmpty()
  account: AccountDto;
}
