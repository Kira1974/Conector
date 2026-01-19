import { TransferMessage } from '../constant/transfer-message.enum';

export interface NetworkErrorInfo {
  code?: string;
  description: string;
  source: 'DIFE' | 'MOL';
}

const HTTP_SERVER_ERROR_CODES = ['500', '502', '503', '504'] as const;

export class ErrorMessageMapper {
  private static readonly DIFE_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    'DIFE-0001': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0002': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0003': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0004': TransferMessage.KEY_NOT_FOUND_OR_CANCELED,
    'DIFE-0005': TransferMessage.KEY_SUSPENDED,
    'DIFE-0006': TransferMessage.KEY_SUSPENDED_BY_PARTICIPANT,
    'DIFE-0007': TransferMessage.VALIDATION_FAILED,
    'DIFE-0008': TransferMessage.PROVIDER_ERROR,
    'DIFE-0009': TransferMessage.VALIDATION_FAILED,
    'DIFE-0010': TransferMessage.VALIDATION_FAILED,
    'DIFE-0011': TransferMessage.VALIDATION_FAILED,
    'DIFE-0012': TransferMessage.VALIDATION_FAILED,
    'DIFE-0013': TransferMessage.VALIDATION_FAILED,
    'DIFE-0014': TransferMessage.VALIDATION_FAILED,
    'DIFE-0015': TransferMessage.VALIDATION_FAILED,
    'DIFE-0016': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-0017': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0018': TransferMessage.VALIDATION_FAILED,
    'DIFE-4000': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-4001': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-5000': TransferMessage.PROVIDER_ERROR,
    'DIFE-5001': TransferMessage.PAYMENT_REJECTED,
    'DIFE-5002': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5003': TransferMessage.PAYMENT_REJECTED,
    'DIFE-5004': TransferMessage.VALIDATION_FAILED,
    'DIFE-5005': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-5006': TransferMessage.VALIDATION_FAILED,
    'DIFE-5007': TransferMessage.VALIDATION_FAILED,
    'DIFE-5008': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5009': TransferMessage.KEY_NOT_FOUND_OR_CANCELED,
    'DIFE-5010': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5011': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5012': TransferMessage.KEY_SUSPENDED,
    'DIFE-5013': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5014': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5015': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5016': TransferMessage.VALIDATION_FAILED,
    'DIFE-5017': TransferMessage.KEY_SUSPENDED,
    'DIFE-5018': TransferMessage.VALIDATION_FAILED,
    'DIFE-5019': TransferMessage.VALIDATION_FAILED,
    'DIFE-5020': TransferMessage.PROVIDER_ERROR,
    'DIFE-5021': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5022': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5023': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-5024': TransferMessage.VALIDATION_FAILED,
    'DIFE-5025': TransferMessage.VALIDATION_FAILED,
    'DIFE-5026': TransferMessage.VALIDATION_FAILED,
    'DIFE-9991': TransferMessage.PROVIDER_ERROR,
    'DIFE-9992': TransferMessage.PROVIDER_ERROR,
    'DIFE-9993': TransferMessage.PROVIDER_ERROR,
    'DIFE-9994': TransferMessage.PROVIDER_ERROR,
    'DIFE-9995': TransferMessage.PROVIDER_ERROR,
    'DIFE-9996': TransferMessage.PROVIDER_ERROR,
    'DIFE-9997': TransferMessage.PROVIDER_ERROR,
    'DIFE-9998': TransferMessage.PROVIDER_ERROR,
    'DIFE-9999': TransferMessage.PROVIDER_ERROR
  };

  private static readonly MOL_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    '403': TransferMessage.PAYMENT_REJECTED,
    '400': TransferMessage.VALIDATION_FAILED,
    '500': TransferMessage.PROVIDER_ERROR,
    'MOL-5000': TransferMessage.PROVIDER_ERROR,
    'MOL-5001': TransferMessage.PAYMENT_REJECTED,
    'MOL-5003': TransferMessage.PAYMENT_REJECTED,
    'MOL-5005': TransferMessage.VALIDATION_FAILED,
    'MOL-4009': TransferMessage.VALIDATION_FAILED,
    'MOL-4008': TransferMessage.VALIDATION_FAILED,
    'MOL-4007': TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4006': TransferMessage.VALIDATION_FAILED,
    'MOL-4003': TransferMessage.VALIDATION_FAILED,
    'MOL-4010': TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4011': TransferMessage.PAYMENT_REJECTED,
    'MOL-4012': TransferMessage.PAYMENT_REJECTED,
    'MOL-4013': TransferMessage.PAYMENT_REJECTED,
    'MOL-4014': TransferMessage.PAYMENT_REJECTED,
    'MOL-4016': TransferMessage.PAYMENT_REJECTED,
    'MOL-4017': TransferMessage.PROVIDER_ERROR,
    'MOL-4019': TransferMessage.PROVIDER_ERROR
  };

  private static readonly HTTP_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    '500': TransferMessage.PROVIDER_ERROR,
    '502': TransferMessage.PROVIDER_ERROR,
    '503': TransferMessage.PROVIDER_ERROR,
    '504': TransferMessage.PROVIDER_ERROR
  };

  private static readonly DIFE_UNCONTROLLED_ERRORS = [
    'DIFE-0001',
    'DIFE-0002',
    'DIFE-0003',
    'DIFE-0008',
    'DIFE-5000',
    'DIFE-5002',
    'DIFE-5008',
    'DIFE-5020',
    'DIFE-9991',
    'DIFE-9992',
    'DIFE-9993',
    'DIFE-9994',
    'DIFE-9995',
    'DIFE-9996',
    'DIFE-9997',
    'DIFE-9998',
    'DIFE-9999'
  ];

  private static readonly MOL_UNCONTROLLED_ERRORS = ['MOL-5000', 'MOL-4017', 'MOL-4019', ...HTTP_SERVER_ERROR_CODES];

  static mapToMessage(errorInfo: NetworkErrorInfo | null): TransferMessage {
    if (!errorInfo) {
      return TransferMessage.UNKNOWN_ERROR;
    }

    if (errorInfo.code) {
      if (errorInfo.code.startsWith('DIFE-')) {
        if (this.DIFE_ERROR_CODE_MAP[errorInfo.code]) {
          return this.DIFE_ERROR_CODE_MAP[errorInfo.code];
        }
      } else if (errorInfo.code.startsWith('MOL-')) {
        if (this.MOL_ERROR_CODE_MAP[errorInfo.code]) {
          return this.MOL_ERROR_CODE_MAP[errorInfo.code];
        }
      }

      const codeMap = errorInfo.source === 'DIFE' ? this.DIFE_ERROR_CODE_MAP : this.MOL_ERROR_CODE_MAP;
      if (codeMap[errorInfo.code]) {
        return codeMap[errorInfo.code];
      }

      if (this.HTTP_ERROR_CODE_MAP[errorInfo.code]) {
        return this.HTTP_ERROR_CODE_MAP[errorInfo.code];
      }
    }

    if (errorInfo.description) {
      const lowerDescription = errorInfo.description.toLowerCase();
      if (lowerDescription.includes('status code') || lowerDescription.includes('http')) {
        const httpCodeMatch = lowerDescription.match(/status code (\d+)|http (\d+)/i);
        if (httpCodeMatch) {
          const httpCode = httpCodeMatch[1] || httpCodeMatch[2];
          if (this.HTTP_ERROR_CODE_MAP[httpCode]) {
            return this.HTTP_ERROR_CODE_MAP[httpCode];
          }
          return TransferMessage.PROVIDER_ERROR;
        }
      }
      if (lowerDescription.includes('payment') && lowerDescription.includes('fail')) {
        return TransferMessage.PAYMENT_PROCESSING_ERROR;
      }
      if (
        lowerDescription.includes('500') ||
        lowerDescription.includes('http 500') ||
        lowerDescription.includes('status code 500')
      ) {
        return TransferMessage.UNKNOWN_ERROR;
      }
      if (lowerDescription.includes('timeout')) {
        return TransferMessage.PROVIDER_ERROR;
      }
    }

    return TransferMessage.UNKNOWN_ERROR;
  }

  static formatNetworkErrorMessage(description: string, source: 'DIFE' | 'MOL'): string {
    return `${source}: ${description}`;
  }

  static isControlledProviderError(errorInfo: NetworkErrorInfo | null): boolean {
    if (!errorInfo?.code) {
      return false;
    }

    if (errorInfo.source === 'DIFE') {
      return !this.DIFE_UNCONTROLLED_ERRORS.includes(errorInfo.code);
    }

    if (errorInfo.source === 'MOL') {
      return !this.MOL_UNCONTROLLED_ERRORS.includes(errorInfo.code);
    }

    return false;
  }
}
