import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ThLoggerService, ThAppStatusCode } from 'themis';

import { AccountQueryController } from '@infrastructure/entrypoint/rest/account-query.controller';
import { AccountQueryUseCase } from '@core/usecase';
import { AccountQueryRequestDto } from '@infrastructure/entrypoint/dto';
import { TransferMessage, AccountQueryState } from '@core/constant';

describe('AccountQueryController', () => {
  let controller: AccountQueryController;
  let accountQueryUseCase: jest.Mocked<AccountQueryUseCase>;
  let mockResponse: any;

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

  const mockAccountQueryUseCase = {
    execute: jest.fn()
  };

  beforeEach(async () => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountQueryController],
      providers: [
        {
          provide: AccountQueryUseCase,
          useValue: mockAccountQueryUseCase
        },
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        }
      ]
    }).compile();

    controller = module.get<AccountQueryController>(AccountQueryController);
    accountQueryUseCase = module.get(AccountQueryUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('queryAccount', () => {
    const mockRequest: AccountQueryRequestDto = {
      account: {
        type: 'BREB',
        value: '@COLOMBIA'
      }
    };

    it('should return 201 for successful account query', async () => {
      const mockSuccessResponse = {
        response: {
          code: ThAppStatusCode.CREATED,
          message: TransferMessage.KEY_RESOLUTION_SUCCESS,
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.SUCCESSFUL,
            userData: {
              name: 'Juan Carlos Pérez Gómez',
              personType: 'N',
              documentType: 'CC',
              documentNumber: '123143455',
              account: {
                type: 'CAHO',
                number: '1234567890123',
                detail: {
                  KEY_VALUE: '@COLOMBIA',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'O',
                  BREB_PARTICIPANT_NIT: '12345678',
                  BREB_PARTICIPANT_SPBVI: 'CRB'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockSuccessResponse);

      await controller.queryAccount(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.CREATED,
          message: TransferMessage.KEY_RESOLUTION_SUCCESS
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_REQUEST', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON_RESPONSE',
        expect.objectContaining({
          status: HttpStatus.CREATED,
          externalTransactionId: 'dife-execution-id'
        })
      );
    });

    it('should return 422 for key not found (REJECTED_BY_PROVIDER)', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.VALIDATION_ERROR,
          message: 'The key does not exist or is canceled.',
          data: {
            state: AccountQueryState.REJECTED_BY_PROVIDER,
            externalTransactionId: 'dife-execution-id',
            networkCode: 'DIFE-0004',
            networkMessage: 'DIFE: The key does not exist or is canceled.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'key_not_found',
                  BREB_KEY_TYPE: 'NRIC',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'key_not_found' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.UNPROCESSABLE_ENTITY
        })
      );
    });

    it('should return 400 for invalid key format (VALIDATION_FAILED)', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.BAD_REQUEST,
          message: 'Invalid key format',
          data: {
            state: AccountQueryState.VALIDATION_FAILED,
            externalTransactionId: 'dife-execution-id',
            networkCode: 'DIFE-5005',
            networkMessage: 'DIFE: Invalid key format',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'invalid_key_5005',
                  BREB_KEY_TYPE: 'NRIC',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'invalid_key_5005' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.BAD_REQUEST
        })
      );
    });

    it('should return 422 for suspended key (REJECTED_BY_PROVIDER)', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.VALIDATION_ERROR,
          message: 'The key is suspended by the client.',
          data: {
            state: AccountQueryState.REJECTED_BY_PROVIDER,
            externalTransactionId: 'dife-execution-id',
            networkCode: 'DIFE-0005',
            networkMessage: 'DIFE: The key is suspended by the client.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'key_suspended',
                  BREB_KEY_TYPE: 'O',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'key_suspended' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.UNPROCESSABLE_ENTITY
        })
      );
    });

    it('should return 502 for DIFE timeout (PROVIDER_ERROR)', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.EXTERNAL_SERVICE_ERROR,
          message: 'Request timeout',
          data: {
            state: AccountQueryState.PROVIDER_ERROR,
            externalTransactionId: 'dife-execution-id',
            networkCode: 'DIFE-5000',
            networkMessage: 'DIFE: Timeout.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'dife_timeout',
                  BREB_KEY_TYPE: 'NRIC',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'dife_timeout' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.BAD_GATEWAY
        })
      );
    });

    it('should return 500 for internal errors (ERROR)', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.INTERNAL_ERROR,
          message: 'Internal server error',
          data: {
            state: AccountQueryState.ERROR,
            networkMessage: 'An unexpected error occurred',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'server_error',
                  BREB_KEY_TYPE: 'NRIC'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'server_error' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: HttpStatus.INTERNAL_SERVER_ERROR
        })
      );
    });

    it('should log request with obfuscated key', async () => {
      const mockSuccessResponse = {
        response: {
          code: ThAppStatusCode.CREATED,
          message: TransferMessage.KEY_RESOLUTION_SUCCESS,
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.SUCCESSFUL,
            userData: {
              name: 'Test User',
              personType: 'N',
              documentType: 'CC',
              documentNumber: '123456789',
              account: {
                type: 'CAHO',
                number: '1234567890123',
                detail: {
                  KEY_VALUE: '3001234567',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'M',
                  BREB_PARTICIPANT_NIT: '12345678',
                  BREB_PARTICIPANT_SPBVI: 'CRB'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockSuccessResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: '3001234567' } }, mockResponse);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON_REQUEST',
        expect.objectContaining({
          accountType: 'BREB',
          keyType: 'M',
          key: '***1234567'
        })
      );
    });

    it('should include all tracking IDs in response log', async () => {
      const mockSuccessResponse = {
        response: {
          code: ThAppStatusCode.CREATED,
          message: TransferMessage.KEY_RESOLUTION_SUCCESS,
          data: {
            externalTransactionId: 'custom-execution-id',
            state: AccountQueryState.SUCCESSFUL,
            userData: {
              name: 'Test User',
              personType: 'N',
              documentType: 'CC',
              documentNumber: '123456789',
              account: {
                type: 'CAHO',
                number: '1234567890123',
                detail: {
                  KEY_VALUE: '@COLOMBIA',
                  BREB_DIFE_EXECUTION_ID: 'custom-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'custom-correlation-id',
                  BREB_DIFE_TRACE_ID: 'custom-trace-id',
                  BREB_KEY_TYPE: 'O',
                  BREB_PARTICIPANT_NIT: '12345678',
                  BREB_PARTICIPANT_SPBVI: 'CRB'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockSuccessResponse);

      await controller.queryAccount(mockRequest, mockResponse);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON_RESPONSE',
        expect.objectContaining({
          externalTransactionId: 'custom-execution-id'
        })
      );
    });
  });
});
