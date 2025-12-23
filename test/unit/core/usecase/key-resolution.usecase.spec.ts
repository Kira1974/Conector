import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { KeyResolutionUseCase } from '@core/usecase/key-resolution.usecase';
import { IDifeProvider } from '@core/provider';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { TransferMessage } from '@core/constant/transfer-message.enum';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
import { KeyTypeDife, PaymentMethodTypeDife, IdentificationTypeDife, PersonTypeDife } from '@core/constant';

describe('KeyResolutionUseCase', () => {
  let useCase: KeyResolutionUseCase;
  let mockDifeProvider: jest.Mocked<IDifeProvider>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockLoggerService = {
    getLogger: jest.fn().mockReturnValue(mockLogger)
  };

  function createDifeSuccessResponse(overrides?: Partial<DifeKeyResponseDto>): DifeKeyResponseDto {
    return {
      correlation_id: 'test-correlation-id',
      execution_id: 'test-execution-id',
      trace_id: 'test-trace-id',
      status: 'SUCCESS',
      key: {
        key: {
          type: 'O' as KeyTypeDife,
          value: '@COLOMBIA'
        },
        participant: {
          nit: '900123456',
          spbvi: 'CRB'
        },
        payment_method: {
          type: 'CAHO' as PaymentMethodTypeDife,
          number: '1234567890'
        },
        person: {
          type: 'N' as PersonTypeDife,
          identification: {
            type: 'CC' as IdentificationTypeDife,
            number: '1234567890'
          },
          name: {
            first_name: 'Miguel',
            second_name: 'Antonio',
            last_name: 'Hernandez',
            second_last_name: 'Gomez'
          }
        }
      },
      ...overrides
    };
  }

  function createDifeErrorResponse(
    errorCode: string,
    errorDescription: string,
    overrides?: Partial<DifeKeyResponseDto>
  ): DifeKeyResponseDto {
    return {
      correlation_id: 'test-correlation-id',
      execution_id: 'test-execution-id',
      trace_id: 'test-trace-id',
      status: 'ERROR',
      errors: [
        {
          code: errorCode,
          description: errorDescription
        }
      ],
      ...overrides
    };
  }

  beforeEach(async () => {
    mockDifeProvider = {
      resolveKey: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: KeyResolutionUseCase,
          useFactory: (difeProvider: IDifeProvider, loggerService: ThLoggerService) => {
            return new KeyResolutionUseCase(difeProvider, loggerService);
          },
          inject: ['DIFE_PROVIDER', ThLoggerService]
        },
        {
          provide: 'DIFE_PROVIDER',
          useValue: mockDifeProvider
        },
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        }
      ]
    }).compile();

    useCase = module.get<KeyResolutionUseCase>(KeyResolutionUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should resolve key successfully and return obfuscated information', async () => {
      const key = '@COLOMBIA';
      const mockDifeResponse = createDifeSuccessResponse();

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('SUCCESS');
      expect(result.response.key).toBe('@COLOMBIA');
      expect(result.response.keyType).toBe('O');
      expect(result.response.documentNumber).toBe('1234567890');
      expect(result.response.documentType).toBe('CC');
      expect(result.response.personName).toBe('Mig*** Ant**** Her****** Gom**');
      expect(result.response.personType).toBe('N');
      expect(result.response.financialEntityNit).toBe('900123456');
      expect(result.response.accountType).toBe('CAHO');
      expect(result.response.accountNumber).toBe('****567890');
    });

    it('should return ERROR when DIFE returns errors array', async () => {
      const key = '@NOEXISTE';
      const mockDifeResponse = createDifeErrorResponse('DIFE-0004', 'The key does not exist or is canceled');

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.key).toBe('@NOEXISTE');
      expect(result.response.keyType).toBe('O');
      expect(result.response.networkCode).toBe('DIFE-0004');
      expect(result.response.networkMessage).toBe('DIFE: The key does not exist or is canceled (DIFE-0004)');
      expect(result.response.message).toBe(TransferMessage.KEY_NOT_FOUND_OR_CANCELED);
    });

    it('should return ERROR when resolvedKey is undefined', async () => {
      const key = '@TEST';
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'SUCCESS'
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.message).toBe(TransferMessage.UNKNOWN_ERROR);
      expect(result.response.networkMessage).toBe('Key resolution failed - no key data in response');
    });

    it('should handle KeyResolutionException and return ERROR', async () => {
      const key = '@TEST';
      const error = new KeyResolutionException(
        key,
        'External service error in https://keymgmt-test.opencco.com/v1/key/resolve: DIFE API error: Invalid request (DIFE-0001)',
        'test-correlation-id'
      );

      mockDifeProvider.resolveKey.mockRejectedValue(error);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.networkCode).toBe('DIFE-0001');
      expect(result.response.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should handle generic errors and return ERROR with UNKNOWN code', async () => {
      const key = '@TEST';
      const error = new Error('Network timeout');

      mockDifeProvider.resolveKey.mockRejectedValue(error);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.networkCode).toBeUndefined();
      expect(result.response.networkMessage).toBe('Network timeout');
      expect(result.response.message).toBe('Unknown error in key resolution network');
    });

    it('should calculate keyType automatically for mobile number', async () => {
      const key = '3001234567';
      const mockDifeResponse = createDifeSuccessResponse({
        key: {
          key: {
            type: 'M' as KeyTypeDife,
            value: '3001234567'
          },
          participant: { nit: '900123456', spbvi: 'CRB' },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'Test',
              second_name: '',
              last_name: 'User',
              second_last_name: ''
            }
          }
        }
      });

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.keyType).toBe('M');
      expect(result.response.responseCode).toBe('SUCCESS');
    });

    it('should calculate keyType automatically for email', async () => {
      const key = 'test@example.com';
      const mockDifeResponse = createDifeSuccessResponse({
        key: {
          key: {
            type: 'E' as KeyTypeDife,
            value: 'test@example.com'
          },
          participant: { nit: '900123456', spbvi: 'CRB' },
          payment_method: {
            type: 'CCTE' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'Test',
              second_name: '',
              last_name: 'User',
              second_last_name: ''
            }
          }
        }
      });

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.keyType).toBe('E');
      expect(result.response.responseCode).toBe('SUCCESS');
    });

    it('should handle DIFE-0001 error correctly', async () => {
      const key = '@TEST';
      const mockDifeResponse = createDifeErrorResponse('DIFE-0001', 'Invalid request');

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.networkCode).toBe('DIFE-0001');
      expect(result.response.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should handle multiple DIFE errors by joining them', async () => {
      const key = '@TEST';
      const mockDifeResponse: DifeKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'ERROR',
        errors: [
          { code: 'DIFE-0001', description: 'Error 1' },
          { code: 'DIFE-0002', description: 'Error 2' }
        ]
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.responseCode).toBe('ERROR');
      expect(result.response.networkMessage).toBe('DIFE: Error 1 (DIFE-0001), Error 2 (DIFE-0002)');
      expect(result.response.networkCode).toBe('DIFE-0001');
      expect(result.response.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should obfuscate account number showing only last 6 digits', async () => {
      const key = '@TEST';
      const mockDifeResponse = createDifeSuccessResponse({
        key: {
          key: { type: 'O' as KeyTypeDife, value: '@TEST' },
          participant: { nit: '900123456', spbvi: 'CRB' },
          payment_method: {
            type: 'CCTE' as PaymentMethodTypeDife,
            number: '12345678901234'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'Test',
              second_name: '',
              last_name: 'User',
              second_last_name: ''
            }
          }
        }
      });

      mockDifeProvider.resolveKey.mockResolvedValue(mockDifeResponse);

      const result = await useCase.execute(key);

      expect(result.response.accountNumber).toBe('********901234');
    });
  });
});
