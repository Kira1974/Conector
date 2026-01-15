export declare class KeyResolutionResponseDto {
    documentNumber?: string;
    documentType?: string;
    personName?: string;
    personType?: string;
    financialEntityNit?: string;
    accountType?: string;
    accountNumber?: string;
    key: string;
    keyType: string;
    responseCode: string;
    message?: string;
    networkCode?: string;
    networkMessage?: string;
}
export interface KeyResolutionResult {
    response: KeyResolutionResponseDto;
    correlationId: string;
    difeExecutionId?: string;
}
