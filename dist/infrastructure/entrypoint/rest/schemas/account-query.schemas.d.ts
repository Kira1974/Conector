export declare class AccountSchema {
    type: string;
    value: string;
}
export declare class AccountQueryRequestSchema {
    account: AccountSchema;
}
export declare class AccountDetailSchema {
    KEY_VALUE: string;
    BREB_DIFE_CORRELATION_ID: string;
    BREB_DIFE_TRACE_ID: string;
    BREB_DIFE_EXECUTION_ID?: string;
    BREB_KEY_TYPE: string;
    BREB_PARTICIPANT_NIT: string;
    BREB_PARTICIPANT_SPBVI: string;
}
export declare class AccountInfoSchema {
    type: string;
    number: string;
    detail: AccountDetailSchema;
}
export declare class UserDataSchema {
    name: string;
    personType: string;
    documentType: string;
    documentNumber: string;
    account: AccountInfoSchema;
}
export declare class AccountQuerySuccessDataSchema {
    externalTransactionId: string;
    state: string;
    userData: UserDataSchema;
}
export declare class AccountQueryErrorDataSchema {
    networkCode?: string;
    networkMessage?: string;
}
export declare class AccountQuerySuccessResponseSchema {
    code: number;
    message: string;
    data: AccountQuerySuccessDataSchema;
}
export declare class AccountQueryErrorResponseSchema {
    code: number;
    message: string;
    data: AccountQueryErrorDataSchema;
}
