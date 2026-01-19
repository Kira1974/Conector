import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ThLoggerService } from 'themis';

import { KeyResolutionController } from '@infrastructure/entrypoint/rest/key-resolution.controller';
import { KeyResolutionUseCase } from '@core/usecase/key-resolution.usecase';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';
import { KeyResolutionParamsDto } from '@infrastructure/entrypoint/dto/key-resolution-params.dto';

describe('KeyResolutionController', () => {
  let controller: KeyResolutionController;
  let mockKeyResolutionUseCase: jest.Mocked<KeyResolutionUseCase>;

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

  beforeEach(async () => {
    mockKeyResolutionUseCase = {
      execute: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeyResolutionController],
      providers: [
        {
          provide: KeyResolutionUseCase,
          useValue: mockKeyResolutionUseCase
        },
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        }
      ]
    }).compile();

    controller = module.get<KeyResolutionController>(KeyResolutionController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getKeyInformation', () => {
    it('should return key information successfully', async () => {
      const params: KeyResolutionParamsDto = { key: '@COLOMBIA' };
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '1234567890',
        documentType: 'CC',
        personName: 'Mig*** Her***',
        personType: 'N',
        financialEntityNit: '900123456',
        accountType: 'CAHO',
        accountNumber: '**334455',
        key: '@COLOMBIA',
        keyType: 'O',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: expectedResponse,
        correlationId: 'test-correlation-id'
      });

      const result = await controller.getKeyInformation(params);

      expect(result).toEqual(expectedResponse);
      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledWith('@COLOMBIA');
      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should throw HttpException with 404 when key does not exist', async () => {
      const params: KeyResolutionParamsDto = { key: '@NOEXISTE' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@NOEXISTE',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key does not exist or is canceled.',
        networkCode: 'DIFE-0004',
        networkMessage: 'DIFE: The key does not exist or is canceled.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });

    it('should throw HttpException with 422 when key is suspended', async () => {
      const params: KeyResolutionParamsDto = { key: '@SUSPENDED' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@SUSPENDED',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key is suspended.',
        networkCode: 'DIFE-0005',
        networkMessage: 'DIFE: The key is suspended by the client.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });

    it('should throw HttpException with 502 when DIFE service fails', async () => {
      const params: KeyResolutionParamsDto = { key: '@TEST' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@TEST',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'An unexpected error occurred.',
        networkCode: 'DIFE-9999',
        networkMessage: 'DIFE: An unexpected error occurred.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });

    it('should throw HttpException with 504 when DIFE times out', async () => {
      const params: KeyResolutionParamsDto = { key: '@TIMEOUT' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@TIMEOUT',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Request timeout.',
        networkCode: 'DIFE-5000',
        networkMessage: 'DIFE: Timeout.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.GATEWAY_TIMEOUT);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });

    it('should throw HttpException with 500 for internal errors without networkCode', async () => {
      const params: KeyResolutionParamsDto = { key: '@ERROR' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@ERROR',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Internal error occurred.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });

    it('should handle mobile number keys', async () => {
      const params: KeyResolutionParamsDto = { key: '3001234567' };
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '1234567890',
        documentType: 'CC',
        personName: 'Ana*** Rod***',
        personType: 'N',
        financialEntityNit: '900123456',
        accountType: 'CAHO',
        accountNumber: '****567890',
        key: '3001234567',
        keyType: 'M',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: expectedResponse,
        correlationId: 'test-correlation-id'
      });

      const result = await controller.getKeyInformation(params);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('M');
    });

    it('should handle email keys', async () => {
      const params: KeyResolutionParamsDto = { key: 'test@example.com' };
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '1234567890',
        documentType: 'CC',
        personName: 'Tes*** Use***',
        personType: 'N',
        financialEntityNit: '900123456',
        accountType: 'CCTE',
        accountNumber: '****567890',
        key: 'test@example.com',
        keyType: 'E',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: expectedResponse,
        correlationId: 'test-correlation-id'
      });

      const result = await controller.getKeyInformation(params);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('E');
    });

    it('should pass key parameter correctly to usecase', async () => {
      const params: KeyResolutionParamsDto = { key: '@TESTKEY123' };
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '1234567890',
        documentType: 'CC',
        personName: 'Tes*** Use***',
        personType: 'N',
        financialEntityNit: '900123456',
        accountType: 'CAHO',
        accountNumber: '****567890',
        key: '@TESTKEY123',
        keyType: 'O',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: expectedResponse,
        correlationId: 'test-correlation-id'
      });

      await controller.getKeyInformation(params);

      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledWith('@TESTKEY123');
    });

    it('should handle network errors from usecase', async () => {
      const params: KeyResolutionParamsDto = { key: '@TEST' };
      const errorResponse: KeyResolutionResponseDto = {
        key: '@TEST',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Network error occurred.',
        networkCode: 'DIFE-5001',
        networkMessage: 'DIFE: Network error.'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue({
        response: errorResponse,
        correlationId: 'test-correlation-id'
      });

      try {
        await controller.getKeyInformation(params);
        fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        expect(error.getResponse()).toEqual(errorResponse);
      }
    });
  });
});
