import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ThLoggerService } from 'themis';

import { HttpClientService } from '@infrastructure/provider/http-clients/http-client.service';
import { ResilienceConfigService } from '@core/util';

describe('HttpClientService', () => {
  let service: HttpClientService;
  let configService: jest.Mocked<ConfigService>;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  const mockResilienceConfig = {
    getHttpTimeout: jest.fn().mockReturnValue(30000),
    getAuthTimeout: jest.fn().mockReturnValue(15000),
    getRetryAttempts: jest.fn().mockReturnValue(3)
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpClientService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn()
          }
        },
        {
          provide: ThLoggerService,
          useValue: {
            getLogger: jest.fn().mockReturnValue(mockLogger)
          }
        },
        {
          provide: ResilienceConfigService,
          useValue: mockResilienceConfig
        }
      ]
    }).compile();

    service = module.get<HttpClientService>(HttpClientService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('instance', () => {
    it('should create axios instance', () => {
      expect(service.instance).toBeDefined();
      expect(service.instance.defaults).toBeDefined();
    });

    it('should have default timeout configured', () => {
      expect(service.instance.defaults.timeout).toBeDefined();
    });
  });

  describe('mTLS configuration', () => {
    it('should handle missing mTLS certificates gracefully', () => {
      configService.get.mockReturnValue(undefined);

      const instance = service.instance;

      expect(instance).toBeDefined();
      expect(instance.defaults.httpsAgent).toBeDefined();
    });

    it('should configure mTLS when both cert and key are provided', () => {
      configService.get.mockReturnValueOnce('-----CLIENT_CERT-----').mockReturnValueOnce('-----CLIENT_KEY-----');

      const instance = service.instance;

      expect(instance).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('MTLS_CLIENT_CERT_CREDIBANCO');
      expect(configService.get).toHaveBeenCalledWith('MTLS_CLIENT_KEY_CREDIBANCO');
    });

    it('should handle only cert without key', () => {
      configService.get.mockReturnValueOnce('-----CLIENT_CERT-----').mockReturnValueOnce(undefined);

      const instance = service.instance;

      expect(instance).toBeDefined();
    });
  });

  describe('interceptors', () => {
    it('should have request interceptor configured', () => {
      const instance = service.instance;

      expect(instance.interceptors.request).toBeDefined();
    });

    it('should have response interceptor configured', () => {
      const instance = service.instance;

      expect(instance.interceptors.response).toBeDefined();
    });
  });

  describe('request method', () => {
    beforeEach(() => {
      jest.spyOn(service.instance, 'request').mockImplementation();
    });

    it('should make request with correlation ID', async () => {
      const mockData = { result: 'success' };
      jest.spyOn(service.instance, 'request').mockResolvedValue({ data: mockData } as any);

      const config = { url: 'http://test.com', method: 'POST' };
      const result = await service.request(config, 'corr-123');

      expect(result).toStrictEqual(mockData);
    });

    it('should make request without correlation ID', async () => {
      const mockData = { result: 'success' };
      jest.spyOn(service.instance, 'request').mockResolvedValue({ data: mockData } as any);

      const config = { url: 'http://test.com', method: 'GET' };
      const result = await service.request(config);

      expect(result).toStrictEqual(mockData);
    });

    it('should handle timeout error', async () => {
      const timeoutError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        config: { url: 'http://test.com' }
      };
      jest.spyOn(service.instance, 'request').mockRejectedValue(timeoutError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle connection refused error', async () => {
      const connError = {
        isAxiosError: true,
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED',
        config: { url: 'http://test.com' }
      };
      jest.spyOn(service.instance, 'request').mockRejectedValue(connError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle ENOTFOUND error', async () => {
      const notFoundError = {
        isAxiosError: true,
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND',
        config: { url: 'http://test.com' }
      };
      jest.spyOn(service.instance, 'request').mockRejectedValue(notFoundError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle error with response', async () => {
      const httpError = {
        isAxiosError: true,
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { message: 'Resource not found' }
        },
        config: { url: 'http://test.com' }
      };
      jest.spyOn(service.instance, 'request').mockRejectedValue(httpError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle error with response but without message', async () => {
      const httpError = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {}
        },
        config: { url: 'http://test.com' }
      };
      jest.spyOn(service.instance, 'request').mockRejectedValue(httpError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle generic Error', async () => {
      const genericError = new Error('Something went wrong');
      jest.spyOn(service.instance, 'request').mockRejectedValue(genericError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });

    it('should handle unknown error type', async () => {
      const unknownError = { weird: 'object' };
      jest.spyOn(service.instance, 'request').mockRejectedValue(unknownError);

      await expect(service.request({ url: 'http://test.com' })).rejects.toThrow();
    });
  });
});
