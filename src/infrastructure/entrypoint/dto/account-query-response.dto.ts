export class AccountDetailDto {
  KEY_VALUE: string;
  BREB_DIFE_CORRELATION_ID: string;
  BREB_DIFE_TRACE_ID: string;
  BREB_DIFE_EXECUTION_ID?: string;
  BREB_KEY_TYPE: string;
  BREB_PARTICIPANT_NIT: string;
  BREB_PARTICIPANT_SPBVI: string;
}

export class AccountInfoDto {
  type: string;
  number: string;
  detail: AccountDetailDto;
}

export class UserDataDto {
  name: string;
  personType: string;
  documentType: string;
  documentNumber: string;
  account: AccountInfoDto;
}

export class AccountQuerySuccessDataDto {
  externalTransactionId: string;
  state: string;
  userData: UserDataDto;
}

export class AccountQueryErrorDataDto {
  networkCode?: string;
  networkMessage?: string;
}
