import { HttpStatus } from '@nestjs/common';
export declare class KeyResolutionHttpStatusMapper {
    static mapNetworkCodeToHttpStatus(networkCode?: string): HttpStatus;
    private static isNotFoundError;
    private static isFormatValidationError;
    private static isBusinessValidationError;
    private static isTimeoutError;
    private static isServiceError;
}
