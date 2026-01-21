import { ThLoggerService, ThAppStatusCode } from 'themis';

import { AccountQueryUseCase } from '@core/usecase';
import { IDifeProvider } from '@core/provider';
import {
  TransferMessage,
  KeyTypeDife,
  PaymentMethodTypeDife,
  IdentificationTypeDife,
  PersonTypeDife,
  AccountQueryState
} from '@core/constant';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';

describe('AccountQueryUseCase', () => {
  let useCase: AccountQueryUseCase;
  let mockDifeProvider: jest.Mocked<IDifeProvider>;
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

    mockLoggerService = {
      getLogger: jest.fn().mockReturnValue(mockLogger)
    };

    useCase = new AccountQueryUseCase(mockDifeProvider, mockLoggerService as ThLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute - Success Cases', () => {
    it('should successfully resolve a key and return 201 with complete data', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: KeyTypeDife.ALPHANUMERIC_IDENTIFIER,
            value: '@COLOMBIA'
          },
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            type: PaymentMethodTypeDife.SAVINGS_ACCOUNT,
            number: '1234567890123'
          },
          person: {
            type: PersonTypeDife.NATURAL_PERSON,
            identification: {
              type: IdentificationTypeDife.CITIZENSHIP_CARD,
              number: '123143455'
            },
            name: {
              first_name: 'Juan',
              second_name: 'Carlos',
              last_name: 'Pérez',
              second_last_name: 'Gómez'
            }
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('@COLOMBIA');

      expect(result.response.code).toBe(ThAppStatusCode.CREATED);
      expect(result.response.message).toBe(TransferMessage.KEY_RESOLUTION_SUCCESS);
      expect(result.response.data.state).toBe(AccountQueryState.SUCCESSFUL);
      expect(result.response.data.externalTransactionId).toBe('dife-execution-id');
      expect(result.response.data.userData.name).toBe('Juan Carlos Pérez Gómez');
      expect(result.response.data.userData.documentType).toBe('CC');
      expect(result.response.data.userData.documentNumber).toBe('123143455');
      expect(result.response.data.userData.account.type).toBe('CAHO');
      expect(result.response.data.userData.account.number).toBe('1234567890123');
      expect(result.response.data.userData.account.detail.KEY_VALUE).toBe('@COLOMBIA');
      expect(result.response.data.userData.account.detail.BREB_KEY_TYPE).toBe('O');
      expect(result.response.data.userData.account.detail.BREB_PARTICIPANT_NIT).toBe('12345678');
    });

    it('should build full name correctly from all name parts', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'SUCCESS',
        key: {
          key: { type: KeyTypeDife.MOBILE_NUMBER, value: '3001234567' },
          participant: { nit: '12345678', spbvi: 'CRB' },
          payment_method: { type: PaymentMethodTypeDife.SAVINGS_ACCOUNT, number: '1234567890123' },
          person: {
            type: PersonTypeDife.NATURAL_PERSON,
            identification: { type: IdentificationTypeDife.CITIZENSHIP_CARD, number: '123143455' },
            name: {
              first_name: 'Juan',
              second_name: '',
              last_name: 'Pérez',
              second_last_name: ''
            }
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('3001234567');

      expect(result.response.data.userData.name).toBe('Juan Pérez');
    });
  });

  describe('execute - Error Cases', () => {
    it('should return 422 (REJECTED_BY_PROVIDER) for key not found (DIFE-0004)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-0004',
            description: 'The key does not exist or is canceled.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('key_not_found');

      expect(result.response.code).toBe(ThAppStatusCode.VALIDATION_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.REJECTED_BY_PROVIDER);
      expect(result.response.data.networkCode).toBe('DIFE-0004');
      expect(result.response.data.networkMessage).toContain('DIFE:');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'DIFE returned business validation errors',
        expect.objectContaining({
          errorCount: 1
        })
      );
    });

    it('should return 400 (VALIDATION_FAILED) for invalid key format (DIFE-5005)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-5005',
            description: 'Invalid key format'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('invalid_key_5005');

      expect(result.response.code).toBe(ThAppStatusCode.BAD_REQUEST);
      expect(result.response.data.state).toBe(AccountQueryState.VALIDATION_FAILED);
      expect(result.response.data.networkCode).toBe('DIFE-5005');
    });

    it('should return 422 (REJECTED_BY_PROVIDER) for suspended key (DIFE-0005)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-0005',
            description: 'The key is suspended by the client.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('key_suspended');

      expect(result.response.code).toBe(ThAppStatusCode.VALIDATION_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.REJECTED_BY_PROVIDER);
      expect(result.response.data.networkCode).toBe('DIFE-0005');
    });

    it('should return 502 (PROVIDER_ERROR) for timeout (DIFE-5000)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-5000',
            description: 'Timeout'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('dife_timeout');

      expect(result.response.code).toBe(ThAppStatusCode.EXTERNAL_SERVICE_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.PROVIDER_ERROR);
      expect(result.response.data.networkCode).toBe('DIFE-5000');
    });

    it('should return 502 (PROVIDER_ERROR) for DIFE errors (DIFE-9999)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-9999',
            description: 'An unexpected error occurred.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('dife_9999');

      expect(result.response.code).toBe(ThAppStatusCode.EXTERNAL_SERVICE_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.PROVIDER_ERROR);
      expect(result.response.data.networkCode).toBe('DIFE-9999');
    });

    it('should return 500 (ERROR) for unknown errors', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'UNKNOWN-ERROR',
            description: 'Unknown error'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('unknown_error');

      expect(result.response.code).toBe(ThAppStatusCode.INTERNAL_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.ERROR);
    });

    it('should handle exceptions and return 500 (ERROR) response', async () => {
      mockDifeProvider.resolveKey.mockRejectedValue(new Error('Network error'));

      const result = await useCase.execute('test_key');

      expect(result.response.code).toBe(ThAppStatusCode.INTERNAL_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.ERROR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Account query failed with exception',
        expect.objectContaining({
          error: 'Network error'
        })
      );
    });

    it('should return 422 (REJECTED_BY_PROVIDER) for key suspended by participant (DIFE-0006)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-0006',
            description: 'The key is suspended by the participant.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('key_suspended_participant');

      expect(result.response.code).toBe(ThAppStatusCode.VALIDATION_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.REJECTED_BY_PROVIDER);
      expect(result.response.data.networkCode).toBe('DIFE-0006');
    });

    it('should return 422 (REJECTED_BY_PROVIDER) for canceled key (DIFE-5009)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-5009',
            description: 'The key is canceled.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('key_canceled');

      expect(result.response.code).toBe(ThAppStatusCode.VALIDATION_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.REJECTED_BY_PROVIDER);
      expect(result.response.data.networkCode).toBe('DIFE-5009');
    });

    it('should return 502 (PROVIDER_ERROR) for DIFE service error (DIFE-0008)', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-0008',
            description: 'An unexpected error occurred in the DICE API.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('dife_0008');

      expect(result.response.code).toBe(ThAppStatusCode.EXTERNAL_SERVICE_ERROR);
      expect(result.response.data.state).toBe(AccountQueryState.PROVIDER_ERROR);
      expect(result.response.data.networkCode).toBe('DIFE-0008');
    });
  });

  describe('execute - Edge Cases', () => {
    it('should handle missing key data in DIFE response', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id',
        trace_id: 'dife-trace-id',
        status: 'SUCCESS'
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('incomplete_key');

      expect(result.response.data.state).toBe(AccountQueryState.ERROR);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'DIFE returned business validation errors',
        expect.objectContaining({
          correlationId: expect.any(String),
          difeCorrelationId: 'test-correlation-id',
          errorCount: 1
        })
      );
    });

    it('should include all DIFE tracking IDs in response detail', async () => {
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'custom-correlation-id',
        execution_id: 'custom-execution-id',
        trace_id: 'custom-trace-id',
        status: 'ERROR',
        errors: [{ code: 'DIFE-0004', description: 'Not found' }]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute('test_key');

      expect(result.response.data.userData.account.detail.BREB_DIFE_EXECUTION_ID).toBe('custom-execution-id');
      expect(result.response.data.userData.account.detail.BREB_DIFE_CORRELATION_ID).toBe('custom-correlation-id');
      expect(result.response.data.userData.account.detail.BREB_DIFE_TRACE_ID).toBe('custom-trace-id');
    });
  });
});
