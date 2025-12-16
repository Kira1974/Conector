import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { SecretsConfigService } from '@config/secrets-config.service';

describe('SecretsConfigService', () => {
  let service: SecretsConfigService;
  let configService: jest.Mocked<ConfigService>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    process.env = { ...originalEnv };

    const mockConfigService = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecretsConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<SecretsConfigService>(SecretsConfigService);
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClientIdCredibanco', () => {
    it('should return value from config service', () => {
      const expectedValue = 'config-client-id';
      configService.get.mockReturnValue(expectedValue);

      const result = service.getClientIdCredibanco();

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith('secrets.clientIdCredibanco');
    });

    it('should return value from environment variable when config is undefined', () => {
      configService.get.mockReturnValue(undefined);
      process.env.CLIENT_ID_CREDIBANCO = 'env-client-id';

      const result = service.getClientIdCredibanco();

      expect(result).toBe('env-client-id');
    });

    it('should return empty string when both config and env are undefined', () => {
      configService.get.mockReturnValue(undefined);
      delete process.env.CLIENT_ID_CREDIBANCO;

      const result = service.getClientIdCredibanco();

      expect(result).toBe('');
    });
  });

  describe('getClientSecretCredibanco', () => {
    it('should return value from config service', () => {
      const expectedValue = 'config-client-secret';
      configService.get.mockReturnValue(expectedValue);

      const result = service.getClientSecretCredibanco();

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith('secrets.clientSecretCredibanco');
    });

    it('should return value from environment variable when config is undefined', () => {
      configService.get.mockReturnValue(undefined);
      process.env.CLIENT_SECRET_CREDIBANCO = 'env-client-secret';

      const result = service.getClientSecretCredibanco();

      expect(result).toBe('env-client-secret');
    });

    it('should return empty string when both config and env are undefined', () => {
      configService.get.mockReturnValue(undefined);
      delete process.env.CLIENT_SECRET_CREDIBANCO;

      const result = service.getClientSecretCredibanco();

      expect(result).toBe('');
    });
  });

  describe('getMtlsClientCertCredibanco', () => {
    it('should return value from config service', () => {
      const expectedValue = 'config-cert';
      configService.get.mockReturnValue(expectedValue);

      const result = service.getMtlsClientCertCredibanco();

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith('secrets.mtlsClientCertCredibanco');
    });

    it('should return value from environment variable when config is undefined', () => {
      configService.get.mockReturnValue(undefined);
      process.env.MTLS_CLIENT_CERT_CREDIBANCO = 'env-cert';

      const result = service.getMtlsClientCertCredibanco();

      expect(result).toBe('env-cert');
    });

    it('should return empty string when both config and env are undefined', () => {
      configService.get.mockReturnValue(undefined);
      delete process.env.MTLS_CLIENT_CERT_CREDIBANCO;

      const result = service.getMtlsClientCertCredibanco();

      expect(result).toBe('');
    });
  });

  describe('getMtlsClientKeyCredibanco', () => {
    it('should return value from config service', () => {
      const expectedValue = 'config-key';
      configService.get.mockReturnValue(expectedValue);

      const result = service.getMtlsClientKeyCredibanco();

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith('secrets.mtlsClientKeyCredibanco');
    });

    it('should return value from environment variable when config is undefined', () => {
      configService.get.mockReturnValue(undefined);
      process.env.MTLS_CLIENT_KEY_CREDIBANCO = 'env-key';

      const result = service.getMtlsClientKeyCredibanco();

      expect(result).toBe('env-key');
    });

    it('should return empty string when both config and env are undefined', () => {
      configService.get.mockReturnValue(undefined);
      delete process.env.MTLS_CLIENT_KEY_CREDIBANCO;

      const result = service.getMtlsClientKeyCredibanco();

      expect(result).toBe('');
    });
  });
});
