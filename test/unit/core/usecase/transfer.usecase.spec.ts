import { ThLoggerService } from 'themis';

import { TransferUseCase } from '@core/usecase';
import { IDifeProvider, IMolPaymentProvider } from '@core/provider';
import { PendingTransferService } from '@core/usecase/pending-transfer.service';
import { KeyResolutionResponse } from '@core/model';
import { TransferFinalState } from '@core/constant';
import { TransferRequestDto, TransferResponseCode, TransferResponseDto } from '@infrastructure/entrypoint/dto';

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
      transactionId: 'TXN-TEST',
      transaction: {
        amount: {
          value: 100.0,
          currency: 'COP'
        },
        description: 'Test transfer'
      },
      transactionParties: {
        payee: {
          accountInfo: {
            value: '3001234567'
          },
          documentNumber: '1234567890'
        }
      },
      additionalData: {}
    };

    const mockDifeResponse: KeyResolutionResponse = {
      correlationId: 'DIFE-CORR-123',
      executionId: 'DIFE-EXEC-456',
      traceId: 'TRACE-789',
      status: 'SUCCESS',
      resolvedKey: {
        keyType: 'M',
        keyValue: '3001234567',
        participant: {
          nit: '900123456',
          spbvi: 'CRB'
        },
        paymentMethod: {
          type: 'CAHO',
          number: '1234567890'
        },
        person: {
          identificationType: 'CC',
          identificationNumber: '1234567890',
          firstName: 'Laura',
          secondName: 'Turga',
          lastName: 'Daniela',
          secondLastName: 'Drama',
          personType: 'N'
        }
      }
    };

    const mockMolResponse: TransferResponseDto = {
      transactionId: 'TXN-TEST',
      responseCode: TransferResponseCode.APPROVED,
      message: 'Payment initiated successfully',
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
        responseCode: TransferFinalState.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.message).toBe('Payment approved');
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

    it('should fail transfer with VALIDATION_FAILED when payee documentNumber does not match DIFE identificationNumber', async () => {
      const mismatchedRequest: TransferRequestDto = {
        ...mockRequest,
        transactionParties: {
          payee: {
            accountInfo: {
              value: '3001234567'
            },
            documentNumber: '9999999999'
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.executeTransfer(mismatchedRequest);

      expect(result.responseCode).toBe(TransferResponseCode.VALIDATION_FAILED);
      expect(result.message).toBe('Payee document number does not match resolved key identification number');
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
      expect(mockPendingTransferService.waitForConfirmation).not.toHaveBeenCalled();
    });

    it('should execute transfer and return REJECTED_BY_PROVIDER when transfer is declined', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferFinalState.DECLINED,
        message: 'Payment declined',
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result.message).toBe('Payment declined');
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
      expect(result.message).toBe('Payment pending');
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
      expect(result.message).toBe('Payment response missing endToEndId');
      expect(mockPendingTransferService.waitForConfirmation).not.toHaveBeenCalled();
    });

    it('should fail transfer when DIFE returns ERROR status', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue({
        correlationId: 'DIFE-CORR-ERROR',
        status: 'ERROR',
        errors: ['DIFE-0001: Invalid request']
      });

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.message).toContain('DIFE-0001');
      expect(mockMolProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should fail transfer when MOL payment creation fails', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockRejectedValue(new Error('MOL payment failed'));

      const result = await useCase.executeTransfer(mockRequest);

      expect(result.responseCode).toBe(TransferResponseCode.ERROR);
      expect(result.message).toBe('MOL payment failed');
    });

    it('should return provider ERROR response when MOL returns error status without throwing', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const errorMolResponse: TransferResponseDto = {
        ...mockMolResponse,
        responseCode: TransferResponseCode.ERROR,
        message: 'Payment error from provider'
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
      expect(result.message).toBe('Network error');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log transfer execution steps', async () => {
      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);
      mockMolProvider.createPayment.mockResolvedValue(mockMolResponse);
      mockPendingTransferService.waitForConfirmation.mockResolvedValue({
        transactionId: 'E2E-456',
        responseCode: TransferFinalState.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-TEST'
        }
      });

      await useCase.executeTransfer(mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith('Starting transfer execution', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith('Waiting for transfer confirmation', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith('Transfer confirmation received', expect.any(Object));
    });
  });
});
