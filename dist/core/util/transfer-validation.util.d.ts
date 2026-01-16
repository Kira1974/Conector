import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { NetworkErrorInfo } from './error-message.mapper';
export declare function buildDifeErrorResponseIfAny(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): TransferResponseDto | null;
export declare function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null;
export declare function isDifeValidationError(errorMessage: string): boolean;
export declare function isMolValidationError(errorMessage: string): boolean;
export declare function isMolValidationErrorByCode(errorInfo: {
    code?: string;
    source?: string;
} | null): boolean;
export declare function determineResponseCodeFromMessage(message: TransferMessage, fromProvider?: boolean, errorInfo?: NetworkErrorInfo | null): TransferResponseCode;
export declare function extractNetworkErrorInfo(errorMessage: string): {
    code?: string;
    source: 'DIFE' | 'MOL';
} | null;
export declare function buildAdditionalDataFromKeyResolution(keyResolution: DifeKeyResponseDto): Record<string, string>;
