import { Test, TestingModule } from '@nestjs/testing';

import { ExternalServicesConfigService } from '@config/external-services-config.service';
import { GenericConfigService } from '@config/generic-config.service';
import { MountebankConfigService } from '@config/mountebank-config.service';

describe('ExternalServicesConfigService', () => {
  let service: ExternalServicesConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;
  let mountebankConfig: jest.Mocked<MountebankConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const mockMountebankConfig = {
      isEnabled: jest.fn().mockReturnValue(false),
      getOAuthPort: jest.fn().mockReturnValue(4545),
      getDifePort: jest.fn().mockReturnValue(4546),
      getMolPort: jest.fn().mockReturnValue(4547)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalServicesConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        },
        {
          provide: MountebankConfigService,
          useValue: mockMountebankConfig
        }
      ]
    }).compile();

    service = module.get<ExternalServicesConfigService>(ExternalServicesConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
    mountebankConfig = module.get<MountebankConfigService>(
      MountebankConfigService
    ) as jest.Mocked<MountebankConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOAuthBaseUrl', () => {
    it('should return localhost URL when Mountebank is enabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(true);
      mountebankConfig.getOAuthPort.mockReturnValue(4545);

      const result = service.getOAuthBaseUrl();

      expect(result).toBe('http://localhost:4545');
      expect(mountebankConfig.isEnabled).toHaveBeenCalled();
      expect(mountebankConfig.getOAuthPort).toHaveBeenCalled();
    });

    it('should return config URL when Mountebank is disabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(false);
      const expectedUrl = 'https://auth.example.com/oauth2';
      genericConfig.get.mockReturnValue(expectedUrl);

      const result = service.getOAuthBaseUrl();

      expect(result).toBe(expectedUrl);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.oauth.baseUrl');
    });

    it('should return config URL when Mountebank throws error', () => {
      mountebankConfig.isEnabled.mockImplementation(() => {
        throw new Error('Mountebank error');
      });
      const expectedUrl = 'https://auth.example.com/oauth2';
      genericConfig.get.mockReturnValue(expectedUrl);

      const result = service.getOAuthBaseUrl();

      expect(result).toBe(expectedUrl);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.oauth.baseUrl');
    });
  });

  describe('getOAuthTimeout', () => {
    it('should return timeout from config', () => {
      const expectedTimeout = 15000;
      genericConfig.get.mockReturnValue(expectedTimeout);

      const result = service.getOAuthTimeout();

      expect(result).toBe(expectedTimeout);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.oauth.timeoutMs');
    });
  });

  describe('getOAuthCacheTtl', () => {
    it('should return cache TTL from config', () => {
      const expectedTtl = 3000;
      genericConfig.get.mockReturnValue(expectedTtl);

      const result = service.getOAuthCacheTtl();

      expect(result).toBe(expectedTtl);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.oauth.cacheTtlSeconds');
    });
  });

  describe('getDifeBaseUrl', () => {
    it('should return localhost URL when Mountebank is enabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(true);
      mountebankConfig.getDifePort.mockReturnValue(4546);

      const result = service.getDifeBaseUrl();

      expect(result).toBe('http://localhost:4546');
      expect(mountebankConfig.isEnabled).toHaveBeenCalled();
      expect(mountebankConfig.getDifePort).toHaveBeenCalled();
    });

    it('should return config URL when Mountebank is disabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(false);
      const expectedUrl = 'https://dife.example.com';
      genericConfig.get.mockReturnValue(expectedUrl);

      const result = service.getDifeBaseUrl();

      expect(result).toBe(expectedUrl);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.dife.baseUrl');
    });
  });

  describe('getDifeTimeout', () => {
    it('should return timeout from config', () => {
      const expectedTimeout = 25000;
      genericConfig.get.mockReturnValue(expectedTimeout);

      const result = service.getDifeTimeout();

      expect(result).toBe(expectedTimeout);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.dife.timeoutMs');
    });
  });

  describe('getMolBaseUrl', () => {
    it('should return localhost URL when Mountebank is enabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(true);
      mountebankConfig.getMolPort.mockReturnValue(4547);

      const result = service.getMolBaseUrl();

      expect(result).toBe('http://localhost:4547');
      expect(mountebankConfig.isEnabled).toHaveBeenCalled();
      expect(mountebankConfig.getMolPort).toHaveBeenCalled();
    });

    it('should return config URL when Mountebank is disabled', () => {
      mountebankConfig.isEnabled.mockReturnValue(false);
      const expectedUrl = 'https://mol.example.com';
      genericConfig.get.mockReturnValue(expectedUrl);

      const result = service.getMolBaseUrl();

      expect(result).toBe(expectedUrl);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.mol.baseUrl');
    });
  });

  describe('getMolTimeout', () => {
    it('should return timeout from config', () => {
      const expectedTimeout = 35000;
      genericConfig.get.mockReturnValue(expectedTimeout);

      const result = service.getMolTimeout();

      expect(result).toBe(expectedTimeout);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.mol.timeoutMs');
    });
  });

  describe('getMolQueryTimeout', () => {
    it('should return query timeout from config', () => {
      const expectedTimeout = 10000;
      genericConfig.get.mockReturnValue(expectedTimeout);

      const result = service.getMolQueryTimeout();

      expect(result).toBe(expectedTimeout);
      expect(genericConfig.get).toHaveBeenCalledWith('externalServices.mol.queryTimeoutMs');
    });
  });
});
