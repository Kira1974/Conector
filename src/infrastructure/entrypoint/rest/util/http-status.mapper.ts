import { HttpStatus } from '@nestjs/common';
import { ThAppStatusCode } from 'themis';

import { TransferResponseCode } from '@infrastructure/entrypoint/dto';

const ThAppStatusToHttpStatus: Record<number, HttpStatus> = {
  [ThAppStatusCode.SUCCESS]: HttpStatus.OK,
  [ThAppStatusCode.CREATED]: HttpStatus.CREATED,
  [ThAppStatusCode.ACCEPTED]: HttpStatus.ACCEPTED,
  [ThAppStatusCode.NO_CONTENT]: HttpStatus.NO_CONTENT,
  [ThAppStatusCode.BAD_REQUEST]: HttpStatus.BAD_REQUEST,
  [ThAppStatusCode.UNAUTHORIZED]: HttpStatus.UNAUTHORIZED,
  [ThAppStatusCode.FORBIDDEN]: HttpStatus.FORBIDDEN,
  [ThAppStatusCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ThAppStatusCode.CONFLICT]: HttpStatus.CONFLICT,
  [ThAppStatusCode.VALIDATION_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ThAppStatusCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ThAppStatusCode.SERVICE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ThAppStatusCode.TIMEOUT]: HttpStatus.GATEWAY_TIMEOUT,
  [ThAppStatusCode.BUSINESS_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ThAppStatusCode.DATA_INTEGRITY_ERROR]: HttpStatus.CONFLICT,
  [ThAppStatusCode.EXTERNAL_SERVICE_ERROR]: HttpStatus.BAD_GATEWAY,
  [ThAppStatusCode.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
  [ThAppStatusCode.RESOURCE_LOCKED]: HttpStatus.LOCKED,
  [ThAppStatusCode.PROCESSING_RETRIES_EXCEEDED]: HttpStatus.SERVICE_UNAVAILABLE,
  [ThAppStatusCode.NO_RETRIES_CONFIGURED]: HttpStatus.SERVICE_UNAVAILABLE
};

export class HttpStatusMapper {
  static mapResponseCodeToHttpStatus(responseCode: TransferResponseCode): number {
    switch (responseCode) {
      case TransferResponseCode.APPROVED:
        return HttpStatus.OK;
      case TransferResponseCode.PENDING:
        return HttpStatus.OK;
      case TransferResponseCode.VALIDATION_FAILED:
        return HttpStatus.BAD_REQUEST;
      case TransferResponseCode.REJECTED_BY_PROVIDER:
        return HttpStatus.UNPROCESSABLE_ENTITY;
      case TransferResponseCode.ERROR:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  static mapThAppStatusCodeToHttpStatus(code: number): HttpStatus {
    return ThAppStatusToHttpStatus[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
