import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { MolPaymentProvider } from '@infrastructure/provider/http-clients/mol-payment-provider';
import { AuthService, HttpClientService } from '@infrastructure/provider/http-clients';
import {
  MolPaymentRequestDto,
  MolPaymentQueryRequestDto,
  MolPaymentQueryResponseDto,
  DifeKeyResponseDto
} from '@infrastructure/provider/http-clients/dto';
import { MolPaymentStatus, MolPaymentStatusMapper } from '@core/mapper';
import { PersonTypeDife, IdentificationTypeDife, PaymentMethodTypeDife, KeyTypeDife } from '@core/constant';
import { TransferRequestDto, TransferResponseCode } from '@infrastructure/entrypoint/dto';
import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { LoggingConfigService } from '@config/logging-config.service';
import { MolPayerConfigService } from '@config/mol-payer-config.service';

import { ResilienceConfigService } from '../../../../../src/infrastructure/provider/resilience-config.service';

describe('MolPaymentProvider', () => {
  let provider: MolPaymentProvider;
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
      post: jest.fn(),
      get: jest.fn()
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
      name: 'Test Payer',
      paymentMethodType: 'SAVINGS_ACCOUNT',
      paymentMethodValue: '000000000',
      paymentMethodCurrency: 'COP'
    })
  };

  beforeEach(async () => {
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
    _httpClientService = module.get<HttpClientService>(HttpClientService) as jest.Mocked<HttpClientService>;
    authService = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;

    mockAuthService.getToken.mockResolvedValue('mock-jwt-token-abc123');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    const mockRequest: TransferRequestDto = {
      transactionId: 'test-transaction-id',
      transaction: {
        amount: {
          value: 100000,
          currency: 'COP'
        },
        description: 'Test payment'
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

    const mockKeyResolution: DifeKeyResponseDto = {
      correlation_id: 'dife-correlation-id',
      trace_id: 'test-transaction-id',
      execution_id: 'dife-exec-id',
      status: 'OK',
      key: {
        key: {
          type: KeyTypeDife.EMAIL,
          value: 'john@doe.com'
        },
        participant: {
          nit: '654987654',
          spbvi: 'CRB'
        },
        payment_method: {
          type: PaymentMethodTypeDife.SAVINGS_ACCOUNT,
          number: '321456987'
        },
        person: {
          type: PersonTypeDife.NATURAL_PERSON,
          identification: {
            type: IdentificationTypeDife.CITIZENSHIP_CARD,
            number: '1234567890'
          },
          name: {
            first_name: 'Jane',
            last_name: 'Doe',
            second_name: '',
            second_last_name: ''
          },
          legal_name: ''
        }
      }
    };

    it('should create payment successfully with mock URL', async () => {
      // Arrange
      mockMolPayerConfig.getPayerConfiguration.mockReturnValue({
        identificationType: 'CITIZENSHIP_ID',
        identificationValue: '1234567890',
        name: 'Payer Name',
        paymentMethodType: 'SAVINGS_ACCOUNT',
        paymentMethodValue: '000000000',
        paymentMethodCurrency: 'COP'
      });

      const mockResponse = {
        status: 200,
        data: {
          execution_id: 'a3flk4asdf9034ajsdkfjasd094s0dapaskdfje32oijn3oin34322lkn4lkn4',
          end_to_end_id: 'd7212cba490094a93badc',
          status: 'PROCESSING'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);

      // Act
      const result = await provider.createPayment(mockRequest, mockKeyResolution);

      // Assert - expect the transformed DTO format (internal_id)
      const expectedDto: MolPaymentRequestDto = {
        additional_informations: 'Test payment',
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
        internal_id: 'dife-correlation-id',
        key_resolution_id: 'test-transaction-id',
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
        transaction_amount: '100000.00',
        transaction_type: 'BREB'
      };

      expect(result).toBeDefined();
      expect(result.responseCode).toBe(TransferResponseCode.APPROVED);
      expect(result.externalTransactionId).toBe('d7212cba490094a93badc');
      expect(result.additionalData?.['END_TO_END']).toBe('d7212cba490094a93badc');
      expect(result.additionalData?.['DIFE_EXECUTION_ID']).toBe('dife-exec-id');
      expect(result.additionalData?.['MOL_EXECUTION_ID']).toBe(
        'a3flk4asdf9034ajsdkfjasd094s0dapaskdfje32oijn3oin34322lkn4lkn4'
      );
      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith(
        'https://mock-mol-api.example.com/v1/payment',
        expectedDto,
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer mock-jwt-token-abc123'
          },
          timeout: 30000
        }
      );

      // Auth is always called now - no conditionals for mocks
      expect(authService.getToken).toHaveBeenCalled();
    });

    it('should use authentication for real API URLs', async () => {
      // Arrange
      mockExternalServicesConfig.getMolBaseUrl.mockReturnValue('https://api.mol.com');
      mockMolPayerConfig.getPayerConfiguration.mockReturnValue({
        identificationType: 'CITIZENSHIP_ID',
        identificationValue: '1234567890',
        name: 'Payer Name',
        paymentMethodType: 'SAVINGS_ACCOUNT',
        paymentMethodValue: '000000000',
        paymentMethodCurrency: 'COP'
      });

      const mockResponse = {
        status: 200,
        data: {
          execution_id: 'MOL-EXEC-999',
          end_to_end_id: 'E2E-999',
          status: 'PROCESSING'
        }
      };

      mockHttpClientService.instance.post.mockResolvedValue(mockResponse);
      mockAuthService.getToken.mockResolvedValue('mock-token');

      // Act
      const result = await provider.createPayment(mockRequest, mockKeyResolution);

      // Assert - expect the transformed DTO format (internal_id)
      const expectedDto: MolPaymentRequestDto = {
        additional_informations: 'Test payment',
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
        internal_id: 'dife-correlation-id',
        key_resolution_id: 'test-transaction-id',
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
        transaction_amount: '100000.00',
        transaction_type: 'BREB'
      };

      expect(result).toBeDefined();
      expect(authService.getToken).toHaveBeenCalled();
      expect(mockHttpClientService.instance.post).toHaveBeenCalledWith('https://api.mol.com/v1/payment', expectedDto, {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer mock-token'
        },
        timeout: 30000
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      mockHttpClientService.instance.post.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(provider.createPayment(mockRequest, mockKeyResolution)).rejects.toThrow(
        'Payment processing failed: Network error'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('queryPaymentStatus', () => {
    beforeEach(() => {
      mockExternalServicesConfig.getMolBaseUrl.mockReturnValue('https://mock-mol-api.example.com');
    });

    it('should query payment status by internal_id successfully', async () => {
      // Arrange
      const queryRequest = MolPaymentQueryRequestDto.byInternalId('123456789123456');

      const mockResponse: MolPaymentQueryResponseDto = {
        errors: [],
        items: [
          {
            billing_responsible: 'DEBT',
            context: 'intra',
            created_at: '2023-10-01T15:04:05Z',
            creditor: {
              identification: { type: 'CITIZENSHIP_ID', value: '12345678' },
              name: 'Creditor Name',
              participant: { id: '654987654', nit: '654987654', spbvi: 'CRB' },
              payment_method: { currency: 'USD', type: 'SAVINGS_ACCOUNT', value: 'account_number_123' }
            },
            end_to_end_id: '1234567890',
            internal_id: '123456789123456',
            payer: {
              identification: { type: 'CITIZENSHIP_ID', value: '12345678' },
              name: 'Payer Name',
              participant: { id: '654987654', nit: '654987654', spbvi: 'CRB' },
              payment_method: { currency: 'USD', type: 'SAVINGS_ACCOUNT', value: 'account_number_123' }
            },
            qr_code_id: 'qr12345',
            status: 'PROCESSING',
            time_mark: { property1: 'value1' },
            transaction_amount: '100.00'
          }
        ],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalResults: 100
        },
        trace_id: '797aa574fb6a5513dbdca1a4a55b1d6e'
      };

      mockHttpClientService.instance.get.mockResolvedValue({ status: 200, data: mockResponse });

      // Act
      const result = await provider.queryPaymentStatus(queryRequest);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockHttpClientService.instance.get).toHaveBeenCalledWith('https://mock-mol-api.example.com/v1/payments', {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer mock-jwt-token-abc123'
        },
        params: { internal_id: '123456789123456' },
        timeout: 30000
      });
    });

    it('should query payment status by end_to_end_id successfully', async () => {
      // Arrange
      const queryRequest = MolPaymentQueryRequestDto.byEndToEndId('c3066f95bd44d5276e2136e419d4d72c27b2b99');

      const mockResponse: MolPaymentQueryResponseDto = {
        errors: [],
        items: [],
        pagination: { currentPage: 1, pageSize: 10, totalResults: 0 },
        trace_id: 'trace-123'
      };

      mockHttpClientService.instance.get.mockResolvedValue({ status: 200, data: mockResponse });

      // Act
      const result = await provider.queryPaymentStatus(queryRequest);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockHttpClientService.instance.get).toHaveBeenCalledWith('https://mock-mol-api.example.com/v1/payments', {
        headers: expect.any(Object),
        params: { end_to_end_id: 'c3066f95bd44d5276e2136e419d4d72c27b2b99' },
        timeout: 30000
      });
    });

    it('should query payment status by date range successfully', async () => {
      // Arrange
      const queryRequest = MolPaymentQueryRequestDto.byDateRange(
        '2023-10-01T00:00:00.000Z',
        '2023-10-01T23:59:59.000Z'
      );

      const mockResponse: MolPaymentQueryResponseDto = {
        errors: [],
        items: [],
        pagination: { currentPage: 1, pageSize: 10, totalResults: 0 },
        trace_id: 'trace-123'
      };

      mockHttpClientService.instance.get.mockResolvedValue({ status: 200, data: mockResponse });

      // Act
      const result = await provider.queryPaymentStatus(queryRequest);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(mockHttpClientService.instance.get).toHaveBeenCalledWith('https://mock-mol-api.example.com/v1/payments', {
        headers: expect.any(Object),
        params: {
          'created_at.start': '2023-10-01T00:00:00.000Z',
          'created_at.end': '2023-10-01T23:59:59.000Z'
        },
        timeout: 30000
      });
    });

    it('should throw error when no parameters provided', async () => {
      // Arrange
      const emptyRequest = new MolPaymentQueryRequestDto();

      // Act & Assert
      await expect(provider.queryPaymentStatus(emptyRequest)).rejects.toThrow(
        'Payment processing failed: At least one query parameter must be provided'
      );
    });

    it('should throw error when only start date provided', async () => {
      // Arrange
      const request = new MolPaymentQueryRequestDto();
      Object.assign(request, { created_at_start: '2023-10-01T00:00:00.000Z' });

      // Act & Assert
      await expect(provider.queryPaymentStatus(request)).rejects.toThrow(
        'Payment processing failed: When using created_at.start, created_at.end must also be provided'
      );
    });

    it('should throw error when date range exceeds 1 day', async () => {
      // Arrange
      const request = MolPaymentQueryRequestDto.byDateRange('2023-10-01T00:00:00.000Z', '2023-10-03T00:00:00.000Z');

      // Act & Assert
      await expect(provider.queryPaymentStatus(request)).rejects.toThrow(
        'Payment processing failed: Date range cannot exceed 1 day'
      );
    });

    it('should throw error when start date is after end date', async () => {
      // Arrange
      const request = MolPaymentQueryRequestDto.byDateRange('2023-10-02T00:00:00.000Z', '2023-10-01T00:00:00.000Z');

      // Act & Assert
      await expect(provider.queryPaymentStatus(request)).rejects.toThrow(
        'Payment processing failed: created_at.start must be before created_at.end'
      );
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      const queryRequest = MolPaymentQueryRequestDto.byInternalId('123456789123456');
      mockHttpClientService.instance.get.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(provider.queryPaymentStatus(queryRequest)).rejects.toThrow(
        'Payment processing failed: Network error'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle HTTP error responses', async () => {
      // Arrange
      const queryRequest = MolPaymentQueryRequestDto.byInternalId('123456789123456');
      const errorResponse = {
        status: 400,
        data: {
          errors: [{ code: '502', description: 'Invalid request' }]
        }
      };

      mockHttpClientService.instance.get.mockResolvedValue(errorResponse);

      // Act & Assert
      await expect(provider.queryPaymentStatus(queryRequest)).rejects.toThrow(
        'Payment processing failed: 502: Invalid request'
      );
    });
  });

  describe('MolPaymentQueryRequestDto Factory Methods', () => {
    it('should create DTO by internal_id', () => {
      // Act
      const result = MolPaymentQueryRequestDto.byInternalId('123456789123456');

      // Assert
      expect(result.internal_id).toBe('123456789123456');
      expect(result.created_at_start).toBeUndefined();
      expect(result.created_at_end).toBeUndefined();
      expect(result.end_to_end_id).toBeUndefined();
    });

    it('should create DTO by end_to_end_id', () => {
      // Act
      const result = MolPaymentQueryRequestDto.byEndToEndId('c3066f95bd44d5276e2136e419d4d72c27b2b99');

      // Assert
      expect(result.end_to_end_id).toBe('c3066f95bd44d5276e2136e419d4d72c27b2b99');
      expect(result.created_at_start).toBeUndefined();
      expect(result.created_at_end).toBeUndefined();
      expect(result.internal_id).toBeUndefined();
    });

    it('should create DTO by date range', () => {
      // Act
      const result = MolPaymentQueryRequestDto.byDateRange('2023-10-01T00:00:00.000Z', '2023-10-01T23:59:59.000Z');

      // Assert
      expect(result.created_at_start).toBe('2023-10-01T00:00:00.000Z');
      expect(result.created_at_end).toBe('2023-10-01T23:59:59.000Z');
      expect(result.end_to_end_id).toBeUndefined();
      expect(result.internal_id).toBeUndefined();
    });
  });

  describe('MOL Status Mapping', () => {
    it('should map COMPLETED status to PENDING response code', () => {
      const result = MolPaymentStatusMapper.mapMolStatusToTransferResponseCode(MolPaymentStatus.COMPLETED);
      expect(result).toBe(TransferResponseCode.PENDING);
    });

    it('should map FAILED status to ERROR response code', () => {
      const result = MolPaymentStatusMapper.mapMolStatusToTransferResponseCode(MolPaymentStatus.FAILED);
      expect(result).toBe(TransferResponseCode.ERROR);
    });

    it('should map unknown status to ERROR response code', () => {
      const result = MolPaymentStatusMapper.mapMolStatusToTransferResponseCode('UNKNOWN' as MolPaymentStatus);
      expect(result).toBe(TransferResponseCode.ERROR);
    });

    it('should return "Pago pendiente" for COMPLETED status', () => {
      const message = MolPaymentStatusMapper.getStatusMessage(MolPaymentStatus.COMPLETED);
      expect(message).toBe('Pago pendiente');
    });

    it('should return "Estado desconocido" for unknown status', () => {
      const message = MolPaymentStatusMapper.getStatusMessage('UNKNOWN' as MolPaymentStatus);
      expect(message).toBe('Estado desconocido');
    });
  });
});
