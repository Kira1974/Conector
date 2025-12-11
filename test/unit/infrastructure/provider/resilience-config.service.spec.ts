import { Test, TestingModule } from '@nestjs/testing';

import { ResilienceConfigService } from '@infrastructure/provider/resilience-config.service';
import { ExternalServicesConfigService } from '@config/external-services-config.service';

describe('ResilienceConfigService', () => {
  let service: ResilienceConfigService;
  let externalServicesConfig: jest.Mocked<ExternalServicesConfigService>;

  beforeEach(async () => {
    const mockExternalServicesConfig = {
      getDifeTimeout: jest.fn().mockReturnValue(25000),
      getMolTimeout: jest.fn().mockReturnValue(35000),
      getOAuthTimeout: jest.fn().mockReturnValue(15000),
      getOAuthCacheTtl: jest.fn().mockReturnValue(3000)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilienceConfigService,
        {
          provide: ExternalServicesConfigService,
          useValue: mockExternalServicesConfig
        }
      ]
    }).compile();

    service = module.get<ResilienceConfigService>(ResilienceConfigService);
    externalServicesConfig = module.get<ExternalServicesConfigService>(
      ExternalServicesConfigService
    ) as jest.Mocked<ExternalServicesConfigService>;
  });

  describe('getDifeTimeout', () => {
    it('should return configured DIFE timeout', () => {
      const timeout = service.getDifeTimeout();

      expect(timeout).toBe(25000);
      expect(externalServicesConfig.getDifeTimeout).toHaveBeenCalled();
    });
  });

  describe('getMolTimeout', () => {
    it('should return configured MOL timeout', () => {
      const timeout = service.getMolTimeout();

      expect(timeout).toBe(35000);
      expect(externalServicesConfig.getMolTimeout).toHaveBeenCalled();
    });
  });

  describe('getOAuthTimeout', () => {
    it('should return configured OAuth timeout', () => {
      const timeout = service.getOAuthTimeout();

      expect(timeout).toBe(15000);
      expect(externalServicesConfig.getOAuthTimeout).toHaveBeenCalled();
    });
  });
});
