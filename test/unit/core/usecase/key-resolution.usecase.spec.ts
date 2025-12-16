import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { KeyResolutionUseCase } from '@core/usecase/key-resolution.usecase';
import { IDifeProvider } from '@core/provider';
import { KeyResolutionResponse } from '@core/model';
import { KeyResolutionException } from '@core/exception/custom.exceptions';
import { TransferMessage } from '@core/constant/transfer-message.enum';

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
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        traceId: 'test-trace-id',
        resolvedKey: {
          keyType: 'O',
          keyValue: '@COLOMBIA',
          participant: {
            nit: '900123456',
            spbvi: 'CRB'
          },
          paymentMethod: {
            number: '1234567890',
            type: 'CAHO'
          },
          person: {
            identificationNumber: '1234567890',
            identificationType: 'CC',
            firstName: 'Miguel',
            lastName: 'Hernandez',
            secondName: 'Antonio',
            secondLastName: 'Gomez',
            personType: 'N'
          }
        },
        status: 'SUCCESS',
        errors: []
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('SUCCESS');
      expect(result.key).toBe('@COLOMBIA');
      expect(result.keyType).toBe('O');
      expect(result.documentNumber).toBe('1234567890');
      expect(result.documentType).toBe('CC');
      expect(result.personName).toBe('Mig*** Ant**** Her****** Gom**');
      expect(result.personType).toBe('N');
      expect(result.financialEntityNit).toBe('900123456');
      expect(result.accountType).toBe('CAHO');
      expect(result.accountNumber).toBe('****567890');
    });

    it('should return ERROR when DIFE returns errors array', async () => {
      const key = '@NOEXISTE';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        status: 'ERROR',
        errors: ['DIFE-0004: The key does not exist or is canceled']
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.key).toBe('@NOEXISTE');
      expect(result.keyType).toBe('O');
      expect(result.networkCode).toBe('DIFE-0004');
      expect(result.networkMessage).toBe('DIFE: The key does not exist or is canceled');
      expect(result.message).toBe(TransferMessage.KEY_NOT_FOUND_OR_CANCELED);
    });

    it('should return ERROR when resolvedKey is undefined', async () => {
      const key = '@TEST';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        status: 'SUCCESS',
        errors: []
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.message).toBe(TransferMessage.UNKNOWN_ERROR);
      expect(result.networkMessage).toBe('Key resolution failed');
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

      expect(result.responseCode).toBe('ERROR');
      expect(result.networkCode).toBe('DIFE-0001');
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should handle generic errors and return ERROR with UNKNOWN code', async () => {
      const key = '@TEST';
      const error = new Error('Network timeout');

      mockDifeProvider.resolveKey.mockRejectedValue(error);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.networkCode).toBeUndefined();
      expect(result.networkMessage).toBe('Network timeout');
      expect(result.message).toBe('Unknown error in key resolution network');
    });

    it('should calculate keyType automatically for mobile number', async () => {
      const key = '3001234567';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        resolvedKey: {
          keyType: 'M',
          keyValue: '3001234567',
          participant: { nit: '900123456', spbvi: 'CRB' },
          paymentMethod: { number: '1234567890', type: 'CAHO' },
          person: {
            identificationNumber: '1234567890',
            identificationType: 'CC',
            firstName: 'Test',
            lastName: 'User',
            personType: 'N'
          }
        },
        status: 'SUCCESS',
        errors: []
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.keyType).toBe('M');
      expect(result.responseCode).toBe('SUCCESS');
    });

    it('should calculate keyType automatically for email', async () => {
      const key = 'test@example.com';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        executionId: 'test-execution-id',
        resolvedKey: {
          keyType: 'E',
          keyValue: 'test@example.com',
          participant: { nit: '900123456', spbvi: 'CRB' },
          paymentMethod: { number: '1234567890', type: 'CCTE' },
          person: {
            identificationNumber: '1234567890',
            identificationType: 'CC',
            firstName: 'Test',
            lastName: 'User',
            personType: 'N'
          }
        },
        status: 'SUCCESS',
        errors: []
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.keyType).toBe('E');
      expect(result.responseCode).toBe('SUCCESS');
    });

    it('should handle DIFE-0001 error correctly', async () => {
      const key = '@TEST';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        status: 'ERROR',
        errors: ['DIFE-0001: Invalid request']
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.networkCode).toBe('DIFE-0001');
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should handle multiple DIFE errors by joining them', async () => {
      const key = '@TEST';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        status: 'ERROR',
        errors: ['DIFE-0001: Error 1', 'DIFE-0002: Error 2']
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.responseCode).toBe('ERROR');
      expect(result.networkMessage).toBe('DIFE: Error 1, DIFE-0002: Error 2');
      expect(result.networkCode).toBe('DIFE-0001');
      expect(result.message).toBe(TransferMessage.KEY_RESOLUTION_ERROR);
    });

    it('should obfuscate account number showing only last 6 digits', async () => {
      const key = '@TEST';
      const mockKeyResolution: KeyResolutionResponse = {
        correlationId: 'test-correlation-id',
        resolvedKey: {
          keyType: 'O',
          keyValue: '@TEST',
          participant: { nit: '900123456', spbvi: 'CRB' },
          paymentMethod: { number: '12345678901234', type: 'CCTE' },
          person: {
            identificationNumber: '1234567890',
            identificationType: 'CC',
            firstName: 'Test',
            lastName: 'User',
            personType: 'N'
          }
        },
        status: 'SUCCESS',
        errors: []
      };

      mockDifeProvider.resolveKey.mockResolvedValue(mockKeyResolution);

      const result = await useCase.execute(key);

      expect(result.accountNumber).toBe('********901234');
    });
  });
});
