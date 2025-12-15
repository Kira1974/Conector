import { TransferRequestDto } from '@infrastructure/entrypoint/dto/transfer-request.dto';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto/transfer-response.dto';
import { KeyResolutionResponse } from '@core/model';
import { TransferMessage } from '@core/constant';
import { buildDifeErrorResponseIfAny } from '@core/util/transfer-validation.util';

describe('transfer-validation.util', () => {
  describe('buildDifeErrorResponseIfAny', () => {
    const mockRequest: TransferRequestDto = {
      transactionId: 'TXN-TEST-123',
      transaction: {
        amount: {
          value: 100000,
          currency: 'COP'
        },
        description: 'Test transfer'
      },
      transactionParties: {
        payee: {
          accountInfo: {
            value: '3001234567'
          }
        }
      }
    };

    it('should return null when status is SUCCESS and resolvedKey exists', () => {
      const keyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        status: 'SUCCESS',
        resolvedKey: {
          keyType: 'O',
          keyValue: '3001234567',
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          paymentMethod: {
            number: '1234567890',
            type: 'CAHO'
          },
          person: {
            identificationNumber: '1234567890',
            identificationType: 'CC',
            personType: 'N',
            firstName: 'John',
            lastName: 'Doe'
          }
        }
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).toBeNull();
    });

    it('should return error when status is ERROR', () => {
      const keyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        status: 'ERROR',
        errors: ['DIFE-0004: The key does not exist or is canceled.']
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).not.toBeNull();
      expect(result?.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result?.message).toBe(TransferMessage.KEY_NOT_FOUND_OR_CANCELED);
      expect(result?.networkCode).toBe('DIFE-0004');
    });

    it('should return error when resolvedKey is undefined even if status is not ERROR', () => {
      const keyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        status: 'SUCCESS',
        resolvedKey: undefined
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).not.toBeNull();
      expect(result?.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result?.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result?.networkMessage).toBe('DIFE: Key resolution returned no data');
      expect(result?.networkCode).toBeUndefined();
    });

    it('should return error when resolvedKey is undefined and status is undefined', () => {
      const keyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        resolvedKey: undefined
      };

      const result = buildDifeErrorResponseIfAny(mockRequest, keyResolution);

      expect(result).not.toBeNull();
      expect(result?.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result?.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result?.networkMessage).toBe('DIFE: Key resolution returned no data');
    });
  });
});
