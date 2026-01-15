import { ThLoggerService } from 'themis';

import { TransferUseCase } from '@core/usecase';
import { IDifeProvider, IMolPaymentProvider } from '@core/provider';
import { PendingTransferService } from '@core/usecase/pending-transfer.service';
import {
  TransferMessage,
  KeyTypeDife,
  PaymentMethodTypeDife,
  IdentificationTypeDife,
  PersonTypeDife
} from '@core/constant';
import { TransferRequestDto, TransferResponseCode, TransferResponseDto } from '@infrastructure/entrypoint/dto';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

describe('TransferUseCase', () => {
  let useCase: TransferUseCase;
  let mockDifeProvider: jest.Mocked<IDifeProvider>;
  let mockMolProvider: jest.Mocked<IMolPaymentProvider>;
  let mockPendingTransferService: jest.Mocked<PendingTransferService>;
  let mockLoggerService: any;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    mockDifeProvider = {
      resolveKey: jest.fn()
    } as any;

    mockMolProvider = {
      createPayment: jest.fn()
    } as any;

    mockPendingTransferService = {
      waitForConfirmation: jest.fn(),
      resolveConfirmation: jest.fn(),
      getPendingCount: jest.fn(),
      clearAll: jest.fn()
    } as any;

    mockLoggerService = {
      getLogger: jest.fn().mockReturnValue(mockLogger)
    };

    useCase = new TransferUseCase(
      mockDifeProvider,
      mockMolProvider,
      mockPendingTransferService,
      mockLoggerService as ThLoggerService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeTransfer', () => {
    const mockRequest: TransferRequestDto = {
      transaction: {
        id: 'TXN-TEST',
        amount: {
          total: 100.0,
          currency: 'COP'
        },
        description: 'Test transfer',
        payee: {
          documentType: 'CC',
          documentNumber: '1234567890',
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

    const mockDifeResponse: DifeKeyResponseDto = {
      correlation_id: 'DIFE-CORR-123',
      execution_id: 'DIFE-EXEC-456',
      trace_id: 'TRACE-789',
      status: 'SUCCESS',
      key: {
        key: {
          type: KeyTypeDife.MOBILE_NUMBER,
          value: '3001234567'
        },
        participant: {
          nit: '900123456',
          spbvi: 'CRB'
        },
        payment_method: {
          type: PaymentMethodTypeDife.SAVINGS_ACCOUNT,
          number: '1234567890'
        },
        person: {
          type: PersonTypeDife.NATURAL_PERSON,
          identification: {
            type: IdentificationTypeDife.CITIZENSHIP_CARD,
            number: '1234567890'
          },
          name: {
            first_name: 'Laura',
            second_name: 'Turga',
            last_name: 'Daniela',
            second_last_name: 'Drama'
          }
        }
      }
    };

    const mockMolResponse: TransferResponseDto = {
      transactionId: 'TXN-TEST',
      responseCode: TransferResponseCode.APPROVED,
      message: TransferMessage.PAYMENT_INITIATED,
      networkMessage: undefined,
      networkCode: undefined,
      externalTransactionId: 'MOL-PAY-123',
      additionalData: {
        END_TO_END: 'E2E-456',
        MOL_EXECUTION_ID: 'DIFE-EXEC-456'
      }
    };

    it('should execute transfer successfully and return APPROVED when transfer confirmation is received', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.message).toBe(TransferMessage.PAYMENT_APPROVED);
      expect(result.externalTransactionId).toBe('MOL-PAY-123');
      expect(result.additionalData?.['END_TO_END']).toBe('E2E-456');
      expect(result.additionalData?.['DOCUMENT_NUMBER']).toBe('1234567890');
      expect(result.additionalData?.['OBFUSCATED_NAME']).toBe('Lau** Tur** Dan**** Dra**');
      expect(result.additionalData?.['ACCOUNT_NUMBER']).toBe('****567890');
      expect(result.additionalData?.['ACCOUNT_TYPE']).toBe('CAHO');

      expect(mockDifeProvider.resolveKey).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.stringMatching(/^\d{15}$/),
          key: '3001234567'
        })
      );

      expect(mockMolProvider.createPayment).toHaveBeenCalledWith(mockRequest, mockDifeResponse);
      expect(mockPendingTransferService.waitForConfirmation).toHaveBeenCalledWith(
        'TXN-TEST',
        'E2E-456',
        expect.any(Number)
      );
    });

    it('should fail transfer with REJECTED_BY_PROVIDER when key format is invalid (lowercase letters, no @)', async () => {
      const invalidKeyRequest: TransferRequestDto = {
        transaction: {
          ...mockRequest.transaction,
          payee: {
            ...mockRequest.transaction.payee,
            account: {
              type: 'MOBILE',
              number: '30131dsdsad211sf04',
              detail: {
                KEY_VALUE: '30131dsdsad211sf04'
              }
            }
          }
        }
      };

      const result = await useCase.executeTransfer(invalidKeyRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.message).toBe(TransferMessage.INVALID_KEY_FORMAT);
      expect(mockDifeProvider.resolveKey).not.toHaveBeenCalled();
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should execute transfer using keyResolution from request additionalData when complete', async () => {
      const requestWithKeyResolution: TransferRequestDto = {
        transaction: {
          ...mockRequest.transaction,
          payee: {
            name: 'Laura Turga Daniela Drama',
            personType: 'N',
            documentType: 'CC',
            documentNumber: '1234567890',
            account: {
              type: 'CAHO',
              number: '1234567890',
              detail: {
                KEY_VALUE: '3001234567',
                BREB_DIFE_CORRELATION_ID: 'CORR-FROM-DOMAIN',
                BREB_DIFE_TRACE_ID: 'TRACE-FROM-DOMAIN',
                BREB_KEY_TYPE: 'O',
                BREB_PARTICIPANT_NIT: '900123456',
                BREB_PARTICIPANT_SPBVI: 'CRB'
              }
            }
          },
          additionalData: {}
        }
      };

      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(requestWithKeyResolution);

      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.additionalData?.['KEY_RESOLUTION_SOURCE']).toBe('FROM_REQUEST');
      expect(mockDifeProvider.resolveKey).not.toHaveBeenCalled();
      expect(mockMolProvider.createPayment).toHaveBeenCalled();
    });

    it('should call DIFE when keyResolution in additionalData is incomplete (missing required fields)', async () => {
      const requestWithIncompleteKeyResolution: TransferRequestDto = {
        transaction: {
          ...mockRequest.transaction,
          additionalData: {
            BREB_DIFE_CORRELATION_ID: 'CORR-FROM-DOMAIN',
            BREB_KEY_TYPE: 'O'
            // Missing BREB_PARTICIPANT_NIT and BREB_PARTICIPANT_SPBVI
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(requestWithIncompleteKeyResolution);

      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.additionalData?.['KEY_RESOLUTION_SOURCE']).toBe('FROM_DIFE');
      expect(mockDifeProvider.resolveKey).toHaveBeenCalled();
      expect(mockMolProvider.createPayment).toHaveBeenCalled();
    });

    it('should call DIFE when keyResolution is not provided in additionalData', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.additionalData?.['KEY_RESOLUTION_SOURCE']).toBe('FROM_DIFE');
      expect(mockDifeProvider.resolveKey).toHaveBeenCalled();
      expect(mockMolProvider.createPayment).toHaveBeenCalled();
    });

    it('should execute transfer and return REJECTED_BY_PROVIDER when transfer is declined', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.REJECTED_BY_PROVIDER,
        message: TransferMessage.PAYMENT_DECLINED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.message).toBe(TransferMessage.PAYMENT_DECLINED);
      expect(result.externalTransactionId).toBe('MOL-PAY-123');
    });

    it('should return PENDING when transfer confirmation times out', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockRejectedValue(
        new Error('The final response from the provider was never received.')
      );

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.PENDING);
      expect(result.message).toBe(TransferMessage.PAYMENT_PENDING);
    });

    it('should return ERROR when MOL response lacks endToEndId', async () => {
      const responseWithoutEndToEnd = {
        ...mockMolResponse,
        additionalData: {}
      };
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(responseWithoutEndToEnd);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.message).toBe(TransferMessage.PAYMENT_PROCESSING_ERROR);
      expect(mockPendingTransferService.waitForConfirmation).not.toHaveBeenCalled();
    });

    it('should fail transfer when DIFE returns ERROR status', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue({
        correlation_id: 'DIFE-CORR-ERROR',
        status: 'ERROR',
        errors: [{ code: 'DIFE-0001', description: 'Invalid request' }]
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.networkCode).toBe('DIFE-0001');
      expect(result.networkMessage).toContain('DIFE:');
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should return REJECTED_BY_PROVIDER when DIFE returns validation error (DIFE-5005)', async () => {
      const keyResolution: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-5005',
            description:
              'The key.value has an invalid format. Only accepts letters and numbers, minimum 6 and maximum 21 characters, all in uppercase, and starting with @.'
          }
        ]
      };
      mockDifeProvider.resolveKey.mockResolvedValue(keyResolution);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.networkCode).toBe('DIFE-5005');
      expect(result.networkMessage).toContain('DIFE:');
      expect(result.message).toBe(TransferMessage.INVALID_KEY_FORMAT);
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should return REJECTED_BY_PROVIDER when DIFE returns validation error (DIFE-4000)', async () => {
      const keyResolution: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'ERROR',
        errors: [{ code: 'DIFE-4000', description: 'Invalid key format' }]
      };
      mockDifeProvider.resolveKey.mockResolvedValue(keyResolution);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.networkCode).toBe('DIFE-4000');
      expect(result.networkMessage).toContain('DIFE:');
      expect(result.message).toBe(TransferMessage.INVALID_KEY_FORMAT);
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should return ERROR when DIFE returns non-validation error (DIFE-0001)', async () => {
      const nonValidationError = new Error(
        'External service error in https://keymgmt-test.opencco.com/v1/key/resolve: DIFE API error: System error (DIFE-0001)'
      );
      mockDifeProvider.resolveKey.mockRejectedValue(nonValidationError);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.networkCode).toBe('DIFE-0001');
      expect(result.networkMessage).toContain('DIFE-0001');
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should return REJECTED_BY_PROVIDER when DIFE returns key not found error (DIFE-0004)', async () => {
      const keyResolution: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'ERROR',
        errors: [{ code: 'DIFE-0004', description: 'The key does not exist or is canceled.' }]
      };
      mockDifeProvider.resolveKey.mockResolvedValue(keyResolution);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.message).toBe(TransferMessage.KEY_NOT_FOUND_OR_CANCELED);
      expect(result.networkCode).toBe('DIFE-0004');
      expect(result.networkMessage).toBe('DIFE: The key does not exist or is canceled.');
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should fail transfer when MOL payment creation fails', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockRejectedValue(new Error('MOL payment failed'));

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.message).toBe(TransferMessage.UNKNOWN_ERROR);
    });

    it('should return provider ERROR response when MOL returns error status without throwing', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const errorMolResponse: TransferResponseDto = {
        ...mockMolResponse,
        responseCode: TransferResponseCode.ERROR,
        message: TransferMessage.PAYMENT_PROCESSING_ERROR
      };

      mockMolProvider.createPayment.mockResolvedValue(errorMolResponse);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result).toEqual(errorMolResponse);
      expect(mockPendingTransferService.waitForConfirmation).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockDifeProvider.resolveKey.mockRejectedValue(new Error('Network error'));

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.message).toBe(TransferMessage.UNKNOWN_ERROR);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log transfer execution steps', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      await useCase.executeTransfer(mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith('Waiting for transfer confirmation', expect.any(Object));
    });

    it('should handle KeyResolutionException with technical error message', async () => {
      const technicalError = new (await import('@core/exception/custom.exceptions')).KeyResolutionException(
        '3006985750',
        "Cannot read properties of undefined (reading 'type')",
        'test-correlation-id'
      );
      mockDifeProvider.resolveKey.mockRejectedValue(technicalError);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.VALIDATION_FAILED);
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result.networkMessage).toContain('Cannot read properties of undefined');
      expect(result.networkCode).toBeUndefined();
    });

    it('should handle KeyResolutionException with DIFE code in message', async () => {
      const difeError = new (await import('@core/exception/custom.exceptions')).KeyResolutionException(
        '3006985750',
        'DIFE-4000: Invalid key format',
        'test-correlation-id'
      );
      mockDifeProvider.resolveKey.mockRejectedValue(difeError);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.VALIDATION_FAILED);
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result.networkMessage).toContain('DIFE-4000');
      expect(result.networkMessage).toContain('Invalid key format');
      expect(result.networkCode).toBe('DIFE-4000');
    });

    it('should handle KeyResolutionException with TypeError in message', async () => {
      const typeError = new (await import('@core/exception/custom.exceptions')).KeyResolutionException(
        '3006985750',
        'TypeError: Cannot read property',
        'test-correlation-id'
      );
      mockDifeProvider.resolveKey.mockRejectedValue(typeError);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.VALIDATION_FAILED);
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result.networkMessage).toContain('TypeError');
      expect(result.networkCode).toBeUndefined();
    });

    it('should handle KeyResolutionException with generic error message', async () => {
      const genericError = new (await import('@core/exception/custom.exceptions')).KeyResolutionException(
        '3006985750',
        'Unknown error occurred',
        'test-correlation-id'
      );
      mockDifeProvider.resolveKey.mockRejectedValue(genericError);

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.VALIDATION_FAILED);
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
      expect(result.networkMessage).toContain('Unknown error occurred');
    });
  });
});
