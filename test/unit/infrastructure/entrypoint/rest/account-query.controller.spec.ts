import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ThLoggerService } from 'themis';

import { AccountQueryController } from '@infrastructure/entrypoint/rest/account-query.controller';
import { AccountQueryUseCase, AccountQueryResponseDto } from '@core/usecase/account-query.usecase';
import {
  AccountQueryRequestDto,
  AccountQuerySuccessDataDto,
  AccountQueryErrorDataDto
} from '@infrastructure/entrypoint/dto';

describe('AccountQueryController', () => {
  let controller: AccountQueryController;
  let accountQueryUseCase: jest.Mocked<AccountQueryUseCase>;

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
        value: '3001234567'
      }
    };

    it('should return successful response with HTTP 201', async () => {
      const mockSuccessData: AccountQuerySuccessDataDto = {
        externalTransactionId: 'DIFE-EXEC-123',
        state: 'SUCCESFUL',
        userData: {
          name: 'Ana Maria Rodriguez Lopez',
          personType: 'N',
          documentType: 'CC',
          documentNumber: '1098765432',
          account: {
            type: 'CAHO',
            number: '9876543210987',
            detail: {
              KEY_VALUE: '3001234567',
              BREB_DIFE_CORRELATION_ID: 'CORR-123',
              BREB_DIFE_TRACE_ID: 'TRACE-456',
              BREB_DIFE_EXECUTION_ID: 'EXEC-789',
              BREB_KEY_TYPE: 'M',
              BREB_PARTICIPANT_NIT: '900123456',
              BREB_PARTICIPANT_SPBVI: 'CRB'
            }
          }
        }
      };

      const mockResponseDto: AccountQueryResponseDto = {
        code: 201,
        message: 'Key resolved successfully',
        data: mockSuccessData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockResponseDto,
        correlationId: 'CORR-123',
        difeExecutionId: 'DIFE-EXEC-123',
        httpStatus: 201
      });

      const result = await controller.queryAccount(mockRequest);

      expect(result).toEqual(mockResponseDto);
      expect(accountQueryUseCase.execute).toHaveBeenCalledWith('3001234567');
      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_REQUEST', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_RESPONSE', expect.any(Object));
    });

    it('should throw HttpException with 400 for invalid key format', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkCode: 'DIFE-4000',
        networkMessage: 'DIFE: Invalid key format (DIFE-4000)'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 400,
        message: 'Invalid key format',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 400
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.BAD_REQUEST)
      );
    });

    it('should throw HttpException with 404 for key not found', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkCode: 'DIFE-0004',
        networkMessage: 'DIFE: The key does not exist or is canceled.'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 404,
        message: 'The key does not exist or is canceled',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 404
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException with 422 for key suspended', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkCode: 'DIFE-0005',
        networkMessage: 'DIFE: The key is suspended by the client.'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 422,
        message: 'The key is suspended by the client',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 422
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.UNPROCESSABLE_ENTITY)
      );
    });

    it('should throw HttpException with 502 for provider error', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkCode: 'DIFE-9999',
        networkMessage: 'DIFE: An unexpected error occurred.'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 502,
        message: 'Key resolution failed',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 502
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.BAD_GATEWAY)
      );
    });

    it('should throw HttpException with 504 for timeout', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkCode: 'DIFE-5000',
        networkMessage: 'DIFE: Timeout.'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 504,
        message: 'Request timeout',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 504
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.GATEWAY_TIMEOUT)
      );
    });

    it('should throw HttpException with 500 for internal error', async () => {
      const mockErrorData: AccountQueryErrorDataDto = {
        networkMessage: 'Unknown error in payment network'
      };

      const mockErrorResponse: AccountQueryResponseDto = {
        code: 500,
        message: 'Unknown error in payment network',
        data: mockErrorData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockErrorResponse,
        correlationId: 'CORR-123',
        httpStatus: 500
      });

      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(HttpException);
      await expect(controller.queryAccount(mockRequest)).rejects.toThrow(
        new HttpException(mockErrorResponse, HttpStatus.INTERNAL_SERVER_ERROR)
      );
    });

    it('should log request and response correctly', async () => {
      const mockSuccessData: AccountQuerySuccessDataDto = {
        externalTransactionId: 'DIFE-EXEC-123',
        state: 'SUCCESFUL',
        userData: {
          name: 'John Doe',
          personType: 'N',
          documentType: 'CC',
          documentNumber: '1234567890',
          account: {
            type: 'CAHO',
            number: '1234567890123',
            detail: {
              KEY_VALUE: '3001234567',
              BREB_DIFE_CORRELATION_ID: 'CORR-123',
              BREB_DIFE_TRACE_ID: 'TRACE-456',
              BREB_DIFE_EXECUTION_ID: 'EXEC-789',
              BREB_KEY_TYPE: 'M',
              BREB_PARTICIPANT_NIT: '900123456',
              BREB_PARTICIPANT_SPBVI: 'CRB'
            }
          }
        }
      };

      const mockResponseDto: AccountQueryResponseDto = {
        code: 201,
        message: 'Key resolved successfully',
        data: mockSuccessData
      };

      accountQueryUseCase.execute.mockResolvedValue({
        response: mockResponseDto,
        correlationId: 'CORR-123',
        difeExecutionId: 'DIFE-EXEC-123',
        httpStatus: 201
      });

      await controller.queryAccount(mockRequest);

      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_REQUEST', {
        accountType: 'BREB',
        key: expect.any(String)
      });

      expect(mockLogger.log).toHaveBeenCalledWith('CHARON_RESPONSE', {
        status: 201,
        correlationId: 'CORR-123',
        externalTransactionId: 'DIFE-EXEC-123',
        responseCode: 'SUCCESFUL',
        responseBody: mockResponseDto
      });
    });
  });
});
