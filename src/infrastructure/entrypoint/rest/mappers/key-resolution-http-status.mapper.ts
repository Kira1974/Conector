import { HttpStatus } from '@nestjs/common';

export class KeyResolutionHttpStatusMapper {
  static mapNetworkCodeToHttpStatus(networkCode?: string): HttpStatus {
    if (!networkCode) {
      return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    // 404 NOT FOUND
    if (this.isNotFoundError(networkCode)) {
      return HttpStatus.NOT_FOUND;
    }

    // 422 UNPROCESSABLE ENTITY
    if (this.isValidationError(networkCode)) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    }

    // 504 GATEWAY TIMEOUT
    if (this.isTimeoutError(networkCode)) {
      return HttpStatus.GATEWAY_TIMEOUT;
    }

    // 502 BAD GATEWAY
    if (this.isServiceError(networkCode)) {
      return HttpStatus.BAD_GATEWAY;
    }

    // 500 INTERNAL SERVER ERROR
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private static isNotFoundError(networkCode: string): boolean {
    const notFoundErrors = ['DIFE-0004', 'DIFE-5009'];
    return notFoundErrors.includes(networkCode);
  }

  private static isValidationError(networkCode: string): boolean {
    const validationErrors = [
      'DIFE-0005',
      'DIFE-0006',
      'DIFE-4000',
      'DIFE-4001',
      'DIFE-5005',
      'DIFE-5012',
      'DIFE-5017'
    ];
    return validationErrors.includes(networkCode);
  }

  private static isTimeoutError(networkCode: string): boolean {
    return networkCode === 'DIFE-5000';
  }

  private static isServiceError(networkCode: string): boolean {
    const serviceErrors = ['DIFE-0008', 'DIFE-5001', 'DIFE-5003', 'DIFE-9999'];

    return serviceErrors.includes(networkCode) || networkCode.startsWith('DIFE-999');
  }
}
