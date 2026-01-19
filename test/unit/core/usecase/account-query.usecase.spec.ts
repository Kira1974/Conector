import { ThLoggerService } from 'themis';

import { AccountQueryUseCase } from '@core/usecase';
import { IDifeProvider } from '@core/provider';
import { KeyTypeDife, PaymentMethodTypeDife, IdentificationTypeDife, PersonTypeDife } from '@core/constant';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { AccountQuerySuccessDataDto, AccountQueryErrorDataDto } from '@infrastructure/entrypoint/dto';

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

  describe('execute', () => {
    it('should return successful response with HTTP 201 for valid key', async () => {
      const keyValue = '3001234567';

      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'DIFE-CORR-123',
        execution_id: 'DIFE-EXEC-456',
        trace_id: 'TRACE-789',
        status: 'SUCCESS',
        key: {
          key: {
            type: KeyTypeDife.MOBILE_NUMBER,
            value: keyValue
          },
          participant: {
            nit: '900123456',
            spbvi: 'CRB'
          },
          payment_method: {
            type: PaymentMethodTypeDife.SAVINGS_ACCOUNT,
            number: '9876543210987'
          },
          person: {
            type: PersonTypeDife.NATURAL_PERSON,
            identification: {
              type: IdentificationTypeDife.CITIZENSHIP_CARD,
              number: '1098765432'
            },
            name: {
              first_name: 'Ana',
              second_name: 'Maria',
              last_name: 'Rodriguez',
              second_last_name: 'Lopez'
            },
            legal_name: undefined
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(keyValue);
      const successData = result.response.data as AccountQuerySuccessDataDto;

      expect(result.httpStatus).toBe(201);
      expect(result.response.code).toBe(201);
      expect(result.response.message).toBe('Key resolved successfully');
      expect(successData.state).toBe('SUCCESFUL');
      expect(successData.userData.name).toBe('Ana Maria Rodriguez Lopez');
      expect(successData.userData.documentNumber).toBe('1098765432');
      expect(successData.userData.account.number).toBe('9876543210987');
      expect(successData.userData.account.type).toBe(PaymentMethodTypeDife.SAVINGS_ACCOUNT);
      expect(successData.userData.account.detail.KEY_VALUE).toBe(keyValue);
      expect(successData.userData.account.detail.BREB_PARTICIPANT_NIT).toBe('900123456');
    });

    it('should return 400 error for invalid key format', async () => {
      const keyValue = '@INVALIDKEY';
      const errorMessage = 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]+) (DIFE-4000)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(400);
      expect(result.response.code).toBe(400);
      expect(errorData.networkCode).toBe('DIFE-4000');
      expect(errorData.networkMessage).toContain('DIFE:');
    });

    it('should return 404 error for key not found', async () => {
      const keyValue = 'key_not_found';
      const errorMessage = 'The key does not exist or is canceled. (DIFE-0004)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(404);
      expect(result.response.code).toBe(404);
      expect(errorData.networkCode).toBe('DIFE-0004');
    });

    it('should return 422 error for key suspended by client', async () => {
      const keyValue = 'key_suspended';
      const errorMessage = 'The key is suspended by the client. (DIFE-0005)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(422);
      expect(result.response.code).toBe(422);
      expect(errorData.networkCode).toBe('DIFE-0005');
    });

    it('should return 422 error for key suspended by participant', async () => {
      const keyValue = 'key_suspended_participant';
      const errorMessage = 'The key is suspended by the participant. (DIFE-0006)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(422);
      expect(result.response.code).toBe(422);
      expect(errorData.networkCode).toBe('DIFE-0006');
    });

    it('should return 502 error for DIFE service error', async () => {
      const keyValue = 'dife_9999';
      const errorMessage = 'An unexpected error occurred. (DIFE-9999)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(502);
      expect(result.response.code).toBe(502);
      expect(errorData.networkCode).toBe('DIFE-9999');
    });

    it('should return 504 error for timeout', async () => {
      const keyValue = 'dife_timeout';
      const errorMessage = 'Timeout. (DIFE-5000)';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(504);
      expect(result.response.code).toBe(504);
      expect(errorData.networkCode).toBe('DIFE-5000');
    });

    it('should return 500 error for unknown error', async () => {
      const keyValue = '3001234567';
      const errorMessage = 'Unknown error occurred';

      mockDifeProvider.resolveKey.mockRejectedValue(new Error(errorMessage));

      const result = await useCase.execute(keyValue);

      expect(result.httpStatus).toBe(500);
      expect(result.response.code).toBe(500);
    });

    it('should handle DIFE response with errors array', async () => {
      const keyValue = '3001234567';

      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'DIFE-CORR-123',
        execution_id: 'DIFE-EXEC-456',
        trace_id: 'TRACE-789',
        status: 'ERROR',
        errors: [
          {
            code: 'DIFE-0004',
            description: 'The key does not exist or is canceled.'
          }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(keyValue);
      const errorData = result.response.data as AccountQueryErrorDataDto;

      expect(result.httpStatus).toBe(404);
      expect(result.response.code).toBe(404);
      expect(errorData.networkCode).toBe('DIFE-0004');
    });

    it('should handle legal entity (company) name correctly', async () => {
      const keyValue = '@company123';

      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'DIFE-CORR-123',
        execution_id: 'DIFE-EXEC-456',
        trace_id: 'TRACE-789',
        status: 'SUCCESS',
        key: {
          key: {
            type: KeyTypeDife.ALPHANUMERIC_IDENTIFIER,
            value: keyValue
          },
          participant: {
            nit: '900123456',
            spbvi: 'CRB'
          },
          payment_method: {
            type: PaymentMethodTypeDife.CHECKING_ACCOUNT,
            number: '1234567890123'
          },
          person: {
            type: PersonTypeDife.LEGAL_PERSON,
            identification: {
              type: IdentificationTypeDife.TAX_IDENTIFICATION_NUMBER,
              number: '900123456789'
            },
            name: {
              first_name: undefined,
              second_name: undefined,
              last_name: undefined,
              second_last_name: undefined
            },
            legal_name: 'Tech Company S.A.S.'
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(keyValue);
      const successData = result.response.data as AccountQuerySuccessDataDto;

      expect(result.httpStatus).toBe(201);
      expect(successData.userData.name).toBe('Tech Company S.A.S.');
      expect(successData.userData.personType).toBe(PersonTypeDife.LEGAL_PERSON);
      expect(successData.userData.documentType).toBe(IdentificationTypeDife.TAX_IDENTIFICATION_NUMBER);
    });

    it('should include all BREB details in account detail', async () => {
      const keyValue = '3001234567';

      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'CUSTOM-CORR-ID',
        execution_id: 'CUSTOM-EXEC-ID',
        trace_id: 'CUSTOM-TRACE-ID',
        status: 'SUCCESS',
        key: {
          key: {
            type: KeyTypeDife.MOBILE_NUMBER,
            value: keyValue
          },
          participant: {
            nit: '900999888',
            spbvi: 'BANK'
          },
          payment_method: {
            type: PaymentMethodTypeDife.SAVINGS_ACCOUNT,
            number: '5555666677778888'
          },
          person: {
            type: PersonTypeDife.NATURAL_PERSON,
            identification: {
              type: IdentificationTypeDife.CITIZENSHIP_CARD,
              number: '1111222233'
            },
            name: {
              first_name: 'John',
              second_name: undefined,
              last_name: 'Doe',
              second_last_name: undefined
            },
            legal_name: undefined
          }
        }
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(keyValue);
      const successData = result.response.data as AccountQuerySuccessDataDto;

      expect(successData.userData.account.detail).toEqual({
        KEY_VALUE: keyValue,
        BREB_DIFE_CORRELATION_ID: 'CUSTOM-CORR-ID',
        BREB_DIFE_TRACE_ID: 'CUSTOM-TRACE-ID',
        BREB_DIFE_EXECUTION_ID: 'CUSTOM-EXEC-ID',
        BREB_KEY_TYPE: 'M',
        BREB_PARTICIPANT_NIT: '900999888',
        BREB_PARTICIPANT_SPBVI: 'BANK'
      });
    });
  });
});
