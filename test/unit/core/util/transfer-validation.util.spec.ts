import { TransferRequestDto } from '@infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto/transfer-response.dto';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import {
  TransferMessage,
  KeyTypeDife,
  PaymentMethodTypeDife,
  IdentificationTypeDife,
  PersonTypeDife
} from '@core/constant';
import { buildDifeErrorResponseIfAny } from '@core/util/transfer-validation.util';

describe('transfer-validation.util', () => {
  describe('buildDifeErrorResponseIfAny', () => {
    const mockRequest: TransferRequestDto = {
      transaction: {
        id: 'TXN-TEST-123',
        amount: {
          total: 100000,
          currency: 'COP'
        },
        description: 'Test transfer',
        payee: {
          account: {
            type: 'MOBILE',
            number: '3001234567',
            detail: {
              KEY_VALUE: '3001234567'
            }
          }
        },
        additionalData: {}
      }
    };

    it('should return null when status is SUCCESS and resolvedKey exists', () => {
      const keyResolution: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: 'O' as KeyTypeDife,
            value: '3001234567'
          },
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            number: '1234567890',
            type: 'CAHO' as PaymentMethodTypeDife
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'John',
              last_name: 'Doe',
              second_name: '',
              second_last_name: ''
            }
          }
        }
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).toBeNull();
    });

    it('should return error when status is ERROR', () => {
      const keyResolution: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'ERROR',
        errors: [{ code: 'DIFE-0004', description: 'The key does not exist or is canceled.' }]
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).not.toBeNull();
      expect(result?.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result?.message).toBe(TransferMessage.KEY_NOT_FOUND_OR_CANCELED);
      expect(result?.networkCode).toBe('DIFE-0004');
    });
  });
});
