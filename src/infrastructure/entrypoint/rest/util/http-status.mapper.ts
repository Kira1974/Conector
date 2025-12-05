import { HttpStatus } from '@nestjs/common';

import { TransferResponseCode } from '@infrastructure/entrypoint/dto';

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
}
