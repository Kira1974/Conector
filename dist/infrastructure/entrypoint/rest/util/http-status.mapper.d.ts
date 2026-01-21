import { HttpStatus } from '@nestjs/common';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
export declare class HttpStatusMapper {
    static mapResponseCodeToHttpStatus(responseCode: TransferResponseCode): number;
    static mapThAppStatusCodeToHttpStatus(code: number): HttpStatus;
}
