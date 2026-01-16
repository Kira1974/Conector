export declare class AccountDetailDto {
    KEY_VALUE: string;
    BREB_DIFE_CORRELATION_ID: string;
    BREB_DIFE_TRACE_ID: string;
    BREB_DIFE_EXECUTION_ID?: string;
    BREB_KEY_TYPE: string;
    BREB_PARTICIPANT_NIT: string;
    BREB_PARTICIPANT_SPBVI: string;
}
export declare class AccountInfoDto {
    type: string;
    number: string;
    detail: AccountDetailDto;
}
export declare class UserDataDto {
    name: string;
    personType: string;
    documentType: string;
    documentNumber: string;
    account: AccountInfoDto;
}
export declare class AccountQueryDataDto {
    externalTransactionId: string;
    state: string;
    userData: UserDataDto;
}
export declare class AccountQueryResponseDto {
    code: string;
    message: string;
    data?: AccountQueryDataDto;
    networkCode?: string;
    networkMessage?: string;
}
