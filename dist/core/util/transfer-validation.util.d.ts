import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { TransferMessage } from '../constant';
import { TransferRequestDto } from '../../infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseDto, TransferResponseCode } from '../../infrastructure/entrypoint/dto/transfer-response.dto';
import { NetworkErrorInfo } from './error-message.mapper';
export declare function buildDifeErrorResponseIfAny(request: TransferRequestDto, keyResolution: DifeKeyResponseDto): TransferResponseDto | null;
export declare function validateKeyFormatBeforeResolution(request: TransferRequestDto): TransferResponseDto | null;
export declare function determineResponseCodeFromMessage(message: TransferMessage, fromProvider?: boolean, errorInfo?: NetworkErrorInfo | null): TransferResponseCode;
export declare function extractNetworkErrorInfo(errorMessage: string): {
    code?: string;
    source: 'DIFE' | 'MOL';
} | null;
