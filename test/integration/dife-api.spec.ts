import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { DifeProvider } from '../../src/infrastructure/provider/http-clients/dife.provider';
import { AuthService, HttpClientService } from '../../src/infrastructure/provider/http-clients';
import { KeyResolutionRequest } from '../../src/core/model';
import { ResilienceConfigService } from '../../src/infrastructure/provider/resilience-config.service';
import { ExternalServicesConfigService } from '../../src/configuration/external-services-config.service';
import { LoggingConfigService } from '../../src/configuration/logging-config.service';

describe('DIFE API Integration Tests', () => {
  let provider: DifeProvider;
  let _httpClientService: jest.Mocked<HttpClientService>;
  let _authService: jest.Mocked<AuthService>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
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

  const mockExternalServicesConfig = {
    getDifeBaseUrl: jest.fn().mockReturnValue('http://localhost:4546')
  };

  const mockLoggingConfig = {
    isHttpHeadersLogEnabled: jest.fn().mockReturnValue(false)
  };

  beforeAll(async () => {
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
        },
        {
          provide: ExternalServicesConfigService,
          useValue: mockExternalServicesConfig
        },
        {
          provide: LoggingConfigService,
          useValue: mockLoggingConfig
        }
      ]
    }).compile();

    provider = module.get<DifeProvider>(DifeProvider);
    _httpClientService = module.get<HttpClientService>(HttpClientService) as jest.Mocked<HttpClientService>;
    _authService = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KEYMGMT_BASE = 'https://mock-dife-api.example.com';
    mockAuthService.getToken.mockResolvedValue('mock-jwt-token-integration-test');
  });

  describe('DIFE API Specification Compliance', () => {
    const mockRequest: KeyResolutionRequest = {
      correlationId: '11223344',
      key: '@COLOMBIA',
      keyType: 'O'
    };

    it('should handle SUCCESS response with complete data from DIFE specification', async () => {
      const mockSuccessResponse = {
        status: 200,
        data: {
          execution_id: '2413fb3709b05939f04cf2e92f7d0897fc2596f9ad0b8a9ea855c7bfebaae892',
          correlation_id: '123456789',
          status: 'SUCCESS',
          trace_id: '83c68c3aadb98c43f1339fc63db3cfe1',
          key: {
            key: {
              type: 'O',
              value: '@COLOMBIA'
            },
            participant: {
              nit: '12345678',
              spbvi: 'CRB'
            },
            payment_method: {
              type: 'CAHO',
              number: '1234567890123'
            },
            person: {
              type: 'N',
              legal_name: 'Nombre de la Persona Jurídica.',
              identification: {
                type: 'CC',
                number: '123143455'
              },
              name: {
                first_name: 'Juan',
                second_name: 'Carlos',
                last_name: 'Pérez',
                second_last_name: 'Gómez'
              }
            }
          },
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

      mockHttpClientService.instance.post.mockResolvedValue(mockSuccessResponse);

      const result = await provider.resolveKey(mockRequest);

      expect(_httpClientService.instance.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/key/resolve'),
        expect.objectContaining({
          correlation_id: '11223344',
          key: {
            type: 'O',
            value: '@COLOMBIA'
          },
          time_marks: {
            C110: expect.any(String),
            C120: expect.any(String)
          }
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token-integration-test'
          }
        })
      );

      expect(result).toBeDefined();
      expect(result.correlation_id).toBe('123456789');
      expect(result.execution_id).toBe('2413fb3709b05939f04cf2e92f7d0897fc2596f9ad0b8a9ea855c7bfebaae892');
      expect(result.status).toBe('SUCCESS');
      expect(result.key).toBeDefined();
      expect(result.key?.key.type).toBe('O');
      expect(result.key?.key.value).toBe('@COLOMBIA');
      expect(result.key?.participant.nit).toBe('12345678');
      expect(result.key?.participant.spbvi).toBe('CRB');
      expect(result.key?.payment_method.type).toBe('CAHO');
      expect(result.key?.payment_method.number).toBe('1234567890123');
      expect(result.key?.person.type).toBe('N');
      expect(result.key?.person.name?.first_name).toBe('Juan');
      expect(result.key?.person.name?.last_name).toBe('Pérez');
      expect(result.key?.person.legal_name).toBe('Nombre de la Persona Jurídica.');
      expect(result.errors || []).toEqual([]);
    });

    it('should handle ERROR response from DIFE specification', async () => {
      const mockErrorResponse = {
        status: 200,
        data: {
          correlation_id: '123456789',
          errors: [
            {
              code: 'DIFE-0001',
              description: 'Invalid request'
            }
          ],
          execution_id: 'c3066f95bd44d5276e2136e419d4d72c27b2b995bb4b7c12cba490094a93badc',
          status: 'ERROR',
          trace_id: '797aa574fb6a5513dbdca1a4a55b1d6e',
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

      mockHttpClientService.instance.post.mockResolvedValue(mockErrorResponse);

      const result = await provider.resolveKey(mockRequest);

      expect(result.status).toBe('ERROR');
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.code).toBe('DIFE-0001');
      expect(result.errors?.[0]?.description).toBe('Invalid request');

      expect(_httpClientService.instance.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/key/resolve'),
        expect.objectContaining({
          correlation_id: '11223344',
          key: {
            type: 'O',
            value: '@COLOMBIA'
          },
          time_marks: {
            C110: expect.any(String),
            C120: expect.any(String)
          }
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token-integration-test'
          }
        })
      );
    });

    it('should generate valid timestamps in time_marks according to DIFE specification', async () => {
      const mockResponse = {
        status: 200,
        data: {
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      await provider.resolveKey(mockRequest);

      const callArgs = mockHttpClientService.instance.post.mock.calls[0];
      const requestBody = callArgs[1];

      expect(requestBody.time_marks.C110).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
      expect(requestBody.time_marks.C120).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);

      const c110Time = new Date(requestBody.time_marks.C110);
      const c120Time = new Date(requestBody.time_marks.C120);
      expect(c110Time.getTime()).toBeLessThanOrEqual(c120Time.getTime());
    });

    it('should handle minimal SUCCESS response gracefully', async () => {
      const mockMinimalResponse = {
        status: 200,
        data: {
          correlation_id: 'minimal-test',
          status: 'SUCCESS'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockMinimalResponse);

      const result = await provider.resolveKey(mockRequest);

      expect(result).toBeDefined();
      expect(result.correlation_id).toBe('minimal-test');
      expect(result.status).toBe('SUCCESS');
      expect(result.key).toBeUndefined();
      expect(result.errors || []).toEqual([]);
    });

    it('should validate request structure matches DIFE specification exactly', async () => {
      const mockResponse = {
        status: 200,
        data: {
          correlation_id: 'validation-test',
          status: 'SUCCESS'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      await provider.resolveKey(mockRequest);

      expect(_httpClientService.instance.post).toHaveBeenCalledWith(
        expect.stringContaining('/v1/key/resolve'),
        expect.objectContaining({
          correlation_id: expect.stringMatching(/^[a-zA-Z0-9-]+$/),
          key: {
            type: expect.stringMatching(/^[A-Z]$/),
            value: expect.stringMatching(/^@[A-Z]+$/)
          },
          time_marks: {
            C110: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/),
            C120: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/)
          }
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-jwt-token-integration-test'
          }
        })
      );
    });
  });
});
