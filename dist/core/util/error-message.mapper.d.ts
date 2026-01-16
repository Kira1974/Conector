import { TransferMessage } from '../constant/transfer-message.enum';
export interface NetworkErrorInfo {
    code?: string;
    description: string;
    source: 'DIFE' | 'MOL';
}
export declare class ErrorMessageMapper {
    private static readonly DIFE_ERROR_CODE_MAP;
    private static readonly MOL_ERROR_CODE_MAP;
    private static readonly HTTP_ERROR_CODE_MAP;
    private static readonly DIFE_UNCONTROLLED_ERRORS;
    private static readonly MOL_UNCONTROLLED_ERRORS;
    static mapToMessage(errorInfo: NetworkErrorInfo | null): TransferMessage;
    static formatNetworkErrorMessage(description: string, source: 'DIFE' | 'MOL'): string;
    static isControlledProviderError(errorInfo: NetworkErrorInfo | null): boolean;
}
