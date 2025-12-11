import { TransferMessage } from '../constant/transfer-message.enum';

export interface NetworkErrorInfo {
  code?: string;
  description: string;
  source: 'DIFE' | 'MOL';
}

export class ErrorMessageMapper {
  private static readonly DIFE_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    'DIFE-4000': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-4001': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-5005': TransferMessage.INVALID_KEY_FORMAT,
    'DIFE-0001': TransferMessage.KEY_RESOLUTION_ERROR,
    'DIFE-0004': TransferMessage.KEY_NOT_FOUND_OR_CANCELED,
    'DIFE-0005': TransferMessage.KEY_SUSPENDED
  };

  private static readonly MOL_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    '403': TransferMessage.PAYMENT_REJECTED,
    '400': TransferMessage.VALIDATION_FAILED,
    '500': TransferMessage.PAYMENT_NETWORK_ERROR,
    'MOL-5005': TransferMessage.VALIDATION_FAILED,
    'MOL-4009': TransferMessage.VALIDATION_FAILED,
    'MOL-4008': TransferMessage.VALIDATION_FAILED,
    'MOL-4007': TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4003': TransferMessage.VALIDATION_FAILED,
    'MOL-4010': TransferMessage.INVALID_ACCOUNT_NUMBER,
    'MOL-4011': TransferMessage.PAYMENT_REJECTED,
    'MOL-4012': TransferMessage.PAYMENT_REJECTED,
    'MOL-4013': TransferMessage.PAYMENT_REJECTED,
    'MOL-4014': TransferMessage.PAYMENT_REJECTED,
    'MOL-4017': TransferMessage.TIMEOUT_ERROR,
    'MOL-4019': TransferMessage.TIMEOUT_ERROR
  };

  private static readonly HTTP_ERROR_CODE_MAP: Record<string, TransferMessage> = {
    '500': TransferMessage.PAYMENT_NETWORK_ERROR,
    '502': TransferMessage.PAYMENT_NETWORK_ERROR,
    '503': TransferMessage.PAYMENT_NETWORK_ERROR,
    '504': TransferMessage.PAYMENT_NETWORK_ERROR
  };

  static mapToMessage(errorInfo: NetworkErrorInfo | null): TransferMessage {
    if (!errorInfo) {
      return TransferMessage.UNKNOWN_ERROR;
    }

    const codeMap = errorInfo.source === 'DIFE' ? this.DIFE_ERROR_CODE_MAP : this.MOL_ERROR_CODE_MAP;

    if (errorInfo.code) {
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
          return errorInfo.source === 'DIFE'
            ? TransferMessage.KEY_RESOLUTION_NETWORK_ERROR
            : TransferMessage.PAYMENT_NETWORK_ERROR;
        }
      }
      if (lowerDescription.includes('payment') && lowerDescription.includes('fail')) {
        return TransferMessage.PAYMENT_PROCESSING_ERROR;
      }
      if (lowerDescription.includes('key') || lowerDescription.includes('resolution')) {
        if (lowerDescription.includes('network') || lowerDescription.includes('connection')) {
          return TransferMessage.KEY_RESOLUTION_NETWORK_ERROR;
        }
      }
      if (lowerDescription.includes('network') || lowerDescription.includes('connection')) {
        return errorInfo.source === 'DIFE'
          ? TransferMessage.KEY_RESOLUTION_NETWORK_ERROR
          : TransferMessage.PAYMENT_NETWORK_ERROR;
      }
      if (lowerDescription.includes('timeout')) {
        return TransferMessage.TIMEOUT_ERROR;
      }
    }

    return TransferMessage.UNKNOWN_ERROR;
  }

  static formatNetworkErrorMessage(description: string, source: 'DIFE' | 'MOL'): string {
    return `${source}: ${description}`;
  }
}
