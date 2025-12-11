import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThLoggerService } from 'themis';

import { TransferRequestDto, TransferResponseCode } from '../../src/infrastructure/entrypoint/dto';
import { KeyResolutionResponse } from '../../src/core/model';
import { ResilienceConfigService } from '../../src/infrastructure/provider/resilience-config.service';
import { MolPaymentProvider } from '../../src/infrastructure/provider/http-clients/mol-payment-provider';
import { AuthService, HttpClientService } from '../../src/infrastructure/provider/http-clients';
import { ExternalServicesConfigService } from '../../src/configuration/external-services-config.service';
import { LoggingConfigService } from '../../src/configuration/logging-config.service';
import { MolPayerConfigService } from '../../src/configuration/mol-payer-config.service';

describe('MOL API Integration Tests', () => {
  let provider: MolPaymentProvider;
  let _httpClientService: jest.Mocked<HttpClientService>;
  let _authService: jest.Mocked<AuthService>;
  let _app: INestApplication;

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
    getMolTimeout: jest.fn().mockReturnValue(30000)
  };

  const mockExternalServicesConfig = {
    getMolBaseUrl: jest.fn().mockReturnValue('https://mock-mol-api.example.com'),
    getMolQueryTimeout: jest.fn().mockReturnValue(10000)
  };

  const mockLoggingConfig = {
    isHttpHeadersLogEnabled: jest.fn().mockReturnValue(false)
  };

  const mockMolPayerConfig = {
    getPayerConfiguration: jest.fn().mockReturnValue({
      identificationType: 'CITIZENSHIP_ID',
      identificationValue: '1234567890',
      name: 'Payer Name',
      paymentMethodType: 'SAVINGS_ACCOUNT',
      paymentMethodValue: '000000000',
      paymentMethodCurrency: 'COP'
    })
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MolPaymentProvider,
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
        },
        {
          provide: MolPayerConfigService,
          useValue: mockMolPayerConfig
        }
      ]
    }).compile();

    provider = module.get<MolPaymentProvider>(MolPaymentProvider);
    _app = module.createNestApplication();
    _httpClientService = module.get<HttpClientService>(HttpClientService) as jest.Mocked<HttpClientService>;
    _authService = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PAYMENT_BASE = 'https://mock-mol-api.example.com';
    process.env.MOL_PAYER_IDENTIFICATION_TYPE = 'CITIZENSHIP_ID';
    process.env.MOL_PAYER_IDENTIFICATION_VALUE = '1234567890';
    process.env.MOL_PAYER_NAME = 'Payer Name';
    process.env.MOL_PAYER_PAYMENT_METHOD_TYPE = 'SAVINGS_ACCOUNT';
    process.env.MOL_PAYER_PAYMENT_METHOD_VALUE = '000000000';
    process.env.MOL_PAYER_PAYMENT_METHOD_CURRENCY = 'COP';
    mockAuthService.getToken.mockResolvedValue('mock-jwt-token-integration-test');
  });

  describe('MOL API Specification Compliance', () => {
    const mockRequest: TransferRequestDto = {
      transactionId: '12345678901234567890123456789012345',
      transaction: {
        amount: {
          value: 100.0,
          currency: 'COP'
        },
        description: 'Regalo para mi madre'
      },
      transactionParties: {
        payee: {
          accountInfo: {
            value: 'john@doe.com'
          }
        }
      },
      additionalData: {}
    };

    const mockKeyResolution: KeyResolutionResponse = {
      correlationId: 'test-correlation-id',
      traceId: '12345678901234567890123456789012345',
      executionId: 'dife-exec-id',
      status: 'SUCCESS',
      resolvedKey: {
        keyType: 'MAIL',
        keyValue: 'john@doe.com',
        participant: {
          nit: '654987654',
          spbvi: 'CRB'
        },
        paymentMethod: {
          type: 'SAVINGS_ACCOUNT',
          number: '321456987'
        },
        person: {
          identificationType: 'CITIZENSHIP_ID',
          identificationNumber: '1234567890',
          firstName: 'Jane',
          lastName: 'Doe',
          personType: 'NATURAL'
        }
      }
    };

    it('should handle SUCCESS response from MOL specification', async () => {
      const mockSuccessResponse = {
        status: 200,
        data: {
          end_to_end_id: 'd7212cba490094a93badc',
          execution_id: 'a3flk4asdf9034ajsdkfjasd094s0dapaskdfje32oijn3oin34322lkn4lkn4',
          status: 'PROCESSING'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockSuccessResponse);

      const result = await provider.createPayment(mockRequest, mockKeyResolution);

      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        expect.stringContaining('/payment'),
        expect.objectContaining({
          additional_informations: 'Regalo para mi madre',
          billing_responsible: 'DEBT',
          creditor: {
            identification: {
              type: 'CITIZENSHIP_ID',
              value: '1234567890'
            },
            key: {
              type: 'MAIL',
              value: 'john@doe.com'
            },
            name: 'Jane Doe',
            participant: {
              id: '654987654',
              spbvi: 'CRB'
            },
            payment_method: {
              currency: 'COP',
              type: 'SAVINGS_ACCOUNT',
              value: '321456987'
            }
          },
          initiation_type: 'KEY',
          internal_id: expect.any(String),
          key_resolution_id: '12345678901234567890123456789012345',
          payer: {
            identification: {
              type: 'CITIZENSHIP_ID',
              value: '1234567890'
            },
            name: 'Payer Name',
            payment_method: {
              currency: 'COP',
              type: 'SAVINGS_ACCOUNT',
              value: '000000000'
            }
          },
          qr_code_id: '',
          time_mark: {
            T110: expect.any(String),
            T120: expect.any(String)
          },
          transaction_amount: '100.00',
          transaction_type: 'BREB'
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer mock-jwt-token-integration-test'
          }
        })
      );

      expect(result).toBeDefined();
      expect(result.additionalData?.['END_TO_END']).toBe('d7212cba490094a93badc');
      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.additionalData?.['DIFE_EXECUTION_ID']).toBe('dife-exec-id');
      expect(result.additionalData?.['MOL_EXECUTION_ID']).toBe(
        'a3flk4asdf9034ajsdkfjasd094s0dapaskdfje32oijn3oin34322lkn4lkn4'
      );
    });

    it('should handle ERROR response from MOL specification', async () => {
      const mockErrorResponse = {
        status: 200,
        data: {
          status: 'ERROR',
          error: {
            code: '403',
            description: 'The participant id is inactive.',
            id: '3a7d5245-1fed-4eba-af0c-5f150ef18a38'
          }
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockErrorResponse);

      await expect(provider.createPayment(mockRequest, mockKeyResolution)).rejects.toThrow(
        'The participant id is inactive.'
      );
    });

    it('should validate request structure matches MOL specification exactly', async () => {
      const mockResponse = {
        status: 200,
        data: {
          end_to_end_id: 'validation-test',
          status: 'PROCESSING'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      await provider.createPayment(mockRequest, mockKeyResolution);

      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        expect.stringContaining('/payment'),
        expect.objectContaining({
          additional_informations: expect.stringMatching(/^.+$/),
          billing_responsible: 'DEBT',
          creditor: expect.objectContaining({
            identification: expect.objectContaining({
              type: expect.stringMatching(/^[A-Z_]+$/),
              value: expect.stringMatching(/^[0-9]+$/)
            }),
            key: expect.objectContaining({
              type: expect.stringMatching(/^[A-Z_]+$/),
              value: expect.stringMatching(/^.+$/)
            }),
            name: expect.stringMatching(/^.+$/),
            participant: expect.objectContaining({
              id: expect.stringMatching(/^[0-9]+$/),
              spbvi: expect.stringMatching(/^[A-Z]+$/)
            }),
            payment_method: expect.objectContaining({
              currency: 'COP',
              type: expect.stringMatching(/^[A-Z_]+$/),
              value: expect.stringMatching(/^[0-9]+$/)
            })
          }),
          initiation_type: 'KEY',
          internal_id: expect.any(String),
          key_resolution_id: expect.stringMatching(/^[0-9a-zA-Z]+$/),
          payer: expect.objectContaining({
            identification: expect.objectContaining({
              type: expect.stringMatching(/^[A-Z_]+$/),
              value: expect.stringMatching(/^[0-9]+$/)
            }),
            name: expect.stringMatching(/^.+$/),
            payment_method: expect.objectContaining({
              currency: 'COP',
              type: expect.stringMatching(/^[A-Z_]+$/),
              value: expect.stringMatching(/^[0-9]+$/)
            })
          }),
          qr_code_id: '',
          time_mark: {
            T110: expect.any(String),
            T120: expect.any(String)
          },
          transaction_amount: expect.stringMatching(/^[0-9]+\.[0-9]{2}$/),
          transaction_type: 'BREB'
        }),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer mock-jwt-token-integration-test'
          }
        })
      );
    });
  });
});
