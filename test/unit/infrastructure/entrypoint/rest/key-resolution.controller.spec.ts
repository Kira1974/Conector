import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { KeyResolutionController } from '@infrastructure/entrypoint/rest/key-resolution.controller';
import { KeyResolutionUseCase } from '@core/usecase/key-resolution.usecase';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';

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
      const key = '@COLOMBIA';
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

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledWith('@COLOMBIA');
      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return error response when key does not exist', async () => {
      const key = '@NOEXISTE';
      const expectedResponse: KeyResolutionResponseDto = {
        key: '@NOEXISTE',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'custom message.',
        networkCode: 'DIFE-0004',
        networkMessage: 'The key does not exist or is canceled'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(result.responseCode).toBe('ERROR');
      expect(result.networkCode).toBe('DIFE-0004');
    });

    it('should handle mobile number keys', async () => {
      const key = '3001234567';
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

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('M');
    });

    it('should handle email keys', async () => {
      const key = 'test@example.com';
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

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('E');
    });

    it('should pass key parameter correctly to usecase', async () => {
      const key = '@TESTKEY123';
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

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      await controller.getKeyInformation(key);

      expect(mockKeyResolutionUseCase.execute).toHaveBeenCalledWith('@TESTKEY123');
    });

    it('should handle network errors from usecase', async () => {
      const key = '@TEST';
      const expectedResponse: KeyResolutionResponseDto = {
        key: '@TEST',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'custom message.',
        networkCode: 'UNKNOWN',
        networkMessage: 'Network timeout'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.networkMessage).toBe('Network timeout');
    });

    it('should handle commerce code keys', async () => {
      const key = '0012345678';
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '900123456',
        documentType: 'NIT',
        personName: 'Com*** Tes***',
        personType: 'L',
        financialEntityNit: '900123456',
        accountType: 'CCTE',
        accountNumber: '****567890',
        key: '0012345678',
        keyType: 'B',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('B');
      expect(result.personType).toBe('L');
    });

    it('should handle identification number keys', async () => {
      const key = '1234567890';
      const expectedResponse: KeyResolutionResponseDto = {
        documentNumber: '1234567890',
        documentType: 'CC',
        personName: 'Jua*** Per***',
        personType: 'N',
        financialEntityNit: '900123456',
        accountType: 'CAHO',
        accountNumber: '****567890',
        key: '1234567890',
        keyType: 'NRIC',
        responseCode: 'SUCCESS'
      };

      mockKeyResolutionUseCase.execute.mockResolvedValue(expectedResponse);

      const result = await controller.getKeyInformation(key);

      expect(result).toEqual(expectedResponse);
      expect(result.keyType).toBe('NRIC');
    });
  });
});
