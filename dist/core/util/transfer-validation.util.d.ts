import { KeyResolutionResponse } from '../model';
import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
export declare function validatePayeeDocumentNumber(request: TransferRequestDto, keyResolution: KeyResolutionResponse): TransferResponseDto | null;
export declare function validateBrebAccountNumber(request: TransferRequestDto, keyResolution: KeyResolutionResponse): TransferResponseDto | null;
export declare function extractBrebAccountNumber(additionalData?: Record<string, unknown>): string | null;
export declare function buildDifeErrorResponseIfAny(request: TransferRequestDto, keyResolution: KeyResolutionResponse): TransferResponseDto | null;
export declare function isDifeValidationError(errorMessage: string): boolean;
export declare function isMolValidationError(errorMessage: string): boolean;
export declare function isMolValidationErrorByCode(errorInfo: {
    code?: string;
    source?: string;
} | null): boolean;
export declare function determineResponseCodeFromMessage(message: TransferMessage): TransferResponseCode;
