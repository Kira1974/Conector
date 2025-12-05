import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { DifeProvider } from '../../../../../src/infrastructure/provider/http-clients/dife.provider';
import { AuthService, HttpClientService } from '../../../../../src/infrastructure/provider/http-clients';
import { KeyResolutionRequest } from '../../../../../src/core/model';
import { ResilienceConfigService } from '../../../../../src/core/util';

describe('DifeProvider', () => {
  let provider: DifeProvider;
  let _httpClientService: jest.Mocked<HttpClientService>;
  let authService: jest.Mocked<AuthService>;

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

  const mockHttpClientService = {
    instance: {
      post: jest.fn()
    }
  };

  const mockAuthService = {
    getToken: jest.fn()
  };

  const mockResilienceConfig = {
    getDifeTimeout: jest.fn().mockReturnValue(30000)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DifeProvider,
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        },
        {
          provide: HttpClientService,
          useValue: mockHttpClientService
        },
        {
          provide: AuthService,
          useValue: mockAuthService
        },
        {
          provide: ResilienceConfigService,
          useValue: mockResilienceConfig
        }
      ]
    }).compile();

    provider = module.get<DifeProvider>(DifeProvider);
    _httpClientService = module.get<HttpClientService>(HttpClientService) as jest.Mocked<HttpClientService>;
    authService = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;

    mockAuthService.getToken.mockResolvedValue('mock-jwt-token-abc123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveKey', () => {
    const mockRequest: KeyResolutionRequest = {
      correlationId: 'test-correlation-id',
      key: '3001234567',
      keyType: 'O'
    };

    it('should resolve key successfully with mock URL', async () => {
      process.env.KEYMGMT_BASE = 'https://mock-dife-api.example.com';

      const mockResponse = {
        status: 200,
        data: {
          correlation_id: 'test-correlation-id',
          execution_id: 'test-execution-id',
          key: {
            key: {
              type: 'O',
              value: '3001234567'
            },
            participant: {
              nit: '123456789',
              spbvi: 'CRB'
            },
            payment_method: {
              type: 'CCTE',
              number: '8888888888'
            },
            person: {
              type: 'N',
              identification: {
                type: 'CC',
                number: '9014586145'
              },
              name: {
                first_name: 'Test',
                second_name: 'User',
                last_name: 'LastName',
                second_last_name: 'SecondLast'
              }
            }
          },
          status: 'SUCCESS',
          time_marks: {
            C110: '2023-10-30T14:45:12.345',
            C120: '2023-10-30T14:47:10.102',
            C210: '2023-10-30T14:45:12.345',
            C215: '2023-10-30T14:47:10.102',
            C310: '2023-10-30T14:45:12.345',
            C320: '2023-10-30T14:47:10.102',
            C230: '2023-10-30T14:45:12.345',
            C240: '2023-10-30T14:47:10.102'
          }
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      const result = await provider.resolveKey(mockRequest);

      expect(result.resolvedKey).toBeDefined();
      expect(result).toBeDefined();
      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        'https://mock-dife-api.example.com/v1/key/resolve',
        expect.objectContaining({
          correlation_id: 'test-correlation-id',
          key: {
            type: 'O',
            value: '3001234567'
          },
          time_marks: {
            C110: expect.any(String),
            C120: expect.any(String)
          }
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token-abc123'
          },
          timeout: 30000
        }
      );

      expect(authService.getToken).toHaveBeenCalled();
    });

    it('should use authentication for real API URLs', async () => {
      process.env.KEYMGMT_BASE = 'https://api.dife.com';

      const mockResponse = {
        status: 200,
        data: {
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);
      mockAuthService.getToken.mockResolvedValue('mock-token');

      const result = await provider.resolveKey(mockRequest);

      expect(result).toBeDefined();
      expect(authService.getToken).toHaveBeenCalled();
      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          correlation_id: 'test-correlation-id',
          key: {
            type: 'O',
            value: '3001234567'
          },
          time_marks: {
            C110: expect.any(String),
            C120: expect.any(String)
          }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-token'
          })
        })
      );
    });

    it('should handle API errors gracefully', async () => {
      const errorResponse = {
        status: 200,
        data: {
          correlation_id: 'test-correlation-id',
          status: 'ERROR',
          errors: [
            {
              code: 'DIFE-0001',
              description: 'Invalid request'
            }
          ],
          execution_id: 'test-execution-id'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(errorResponse);

      await expect(provider.resolveKey(mockRequest)).rejects.toThrow('DIFE API error: Invalid request (DIFE-0001)');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'DIFE API returned error response',
        expect.objectContaining({
          correlationId: 'test-correlation-id',
          errorCode: 'DIFE-0001',
          errorDescription: 'Invalid request'
        })
      );
    });

    it('should use default keyType O when not provided', async () => {
      process.env.KEYMGMT_BASE = 'https://mock-dife-api.example.com';

      const requestWithoutKeyType = {
        correlationId: 'test-correlation-id',
        key: '3001234567'
      };

      const mockResponse = {
        status: 200,
        data: {
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      await provider.resolveKey(requestWithoutKeyType);

      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          correlation_id: 'test-correlation-id',
          key: {
            type: 'O',
            value: '3001234567'
          },
          time_marks: {
            C110: expect.any(String),
            C120: expect.any(String)
          }
        }),
        expect.any(Object)
      );
    });
  });
});
