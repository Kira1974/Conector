import { Test, TestingModule } from '@nestjs/testing';
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

      expect(mockResponse.status).toHaveBeenCalledWith(ThAppStatusCode.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSuccessResponse.response);
      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_REQUEST', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON_RESPONSE',
        expect.objectContaining({
          status: ThAppStatusCode.CREATED,
          externalTransactionId: 'dife-execution-id'
        })
      );
    });

    it('should return 404 for key not found', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.NOT_FOUND,
          message: 'The key does not exist or is canceled.',
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.REJECTED_BY_PROVIDER,
            networkCode: 'DIFE-0004',
            networkMessage: 'DIFE: The key does not exist or is canceled.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'key_not_found',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'NRIC'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'key_not_found' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(ThAppStatusCode.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse.response);
    });

    it('should return 400 for invalid key format', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.BAD_REQUEST,
          message: 'Invalid key format',
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.VALIDATION_FAILED,
            networkCode: 'DIFE-5005',
            networkMessage: 'DIFE: Invalid key format',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'invalid_key_5005',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'NRIC'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'invalid_key_5005' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(ThAppStatusCode.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse.response);
    });

    it('should return 422 for suspended key', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.VALIDATION_ERROR,
          message: 'The key is suspended by the client.',
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.REJECTED_BY_PROVIDER,
            networkCode: 'DIFE-0005',
            networkMessage: 'DIFE: The key is suspended by the client.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'key_suspended',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'O'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'key_suspended' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(ThAppStatusCode.VALIDATION_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse.response);
    });

    it('should return 504 for timeout', async () => {
      const mockErrorResponse = {
        response: {
          code: ThAppStatusCode.TIMEOUT,
          message: 'Request timeout',
          data: {
            externalTransactionId: 'dife-execution-id',
            state: AccountQueryState.PROVIDER_ERROR,
            networkCode: 'DIFE-5000',
            networkMessage: 'DIFE: Timeout.',
            userData: {
              account: {
                detail: {
                  KEY_VALUE: 'dife_timeout',
                  BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                  BREB_DIFE_CORRELATION_ID: 'test-correlation-id',
                  BREB_DIFE_TRACE_ID: 'dife-trace-id',
                  BREB_KEY_TYPE: 'NRIC'
                }
              }
            }
          }
        }
      };

      mockAccountQueryUseCase.execute.mockResolvedValue(mockErrorResponse);

      await controller.queryAccount({ account: { type: 'BREB', value: 'dife_timeout' } }, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(ThAppStatusCode.TIMEOUT);
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse.response);
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
          externalTransactionId: 'custom-execution-id',
          responseBody: mockSuccessResponse.response
        })
      );
    });
  });
});
