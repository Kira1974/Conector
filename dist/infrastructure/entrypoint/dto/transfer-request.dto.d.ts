export type CurrencyCode = 'COP' | 'USD' | 'EUR';
export declare class AmountDto {
    total: number;
    currency: CurrencyCode;
}
export declare class PayerAccountDto {
    type: string;
    number: string;
}
export declare class PayerDto {
    account: PayerAccountDto;
}
export declare class PayeeAccountDetailDto {
    [key: string]: any;
}
export declare class PayeeAccountDto {
    type?: string;
    number?: string;
    detail?: PayeeAccountDetailDto;
}
export declare class PayeeDto {
    name?: string;
    personType?: string;
    documentType?: string;
    documentNumber?: string;
    account: PayeeAccountDto;
}
export declare class AdditionalDataDto {
    [key: string]: any;
}
export declare class TransactionDto {
    id: string;
    amount: AmountDto;
    description: string;
    payer?: PayerDto;
    payee: PayeeDto;
    additionalData?: AdditionalDataDto;
}
export declare class TransferRequestDto {
    transaction: TransactionDto;
}
