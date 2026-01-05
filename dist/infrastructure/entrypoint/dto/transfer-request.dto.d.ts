export type CurrencyCode = 'COP' | 'USD' | 'EUR';
export declare class AmountDto {
    value: number;
    currency: CurrencyCode;
}
export declare class TransactionDto {
    amount: AmountDto;
    description: string;
}
export declare class PayeeAccountInfoDto {
    value: string;
}
export declare class PayeeDto {
    accountInfo: PayeeAccountInfoDto;
    documentNumber?: string;
}
export declare class TransactionPartiesDto {
    payee: PayeeDto;
}
export declare class AdditionalDataDto {
    [key: string]: any;
}
export declare class TransferRequestDto {
    transactionId: string;
    transaction: TransactionDto;
    transactionParties: TransactionPartiesDto;
    additionalData?: AdditionalDataDto;
}
