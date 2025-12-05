import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { ResilienceConfigService } from '@core/util';

describe('ResilienceConfigService', () => {
  let service: ResilienceConfigService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResilienceConfigService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn()
          }
        }
      ]
    }).compile();

    service = module.get<ResilienceConfigService>(ResilienceConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getDifeTimeout', () => {
    it('should return configured DIFE timeout', () => {
      jest.spyOn(configService, 'get').mockReturnValue('25000');

      const timeout = service.getDifeTimeout();

      expect(timeout).toBe(25000);
      expect(configService.get).toHaveBeenCalledWith('DIFE_TIMEOUT_MS');
    });
  });

  describe('getMolTimeout', () => {
    it('should return configured MOL timeout', () => {
      jest.spyOn(configService, 'get').mockReturnValue('35000');

      const timeout = service.getMolTimeout();

      expect(timeout).toBe(35000);
      expect(configService.get).toHaveBeenCalledWith('MOL_TIMEOUT_MS');
    });
  });

  describe('getOAuthTimeout', () => {
    it('should return configured OAuth timeout', () => {
      jest.spyOn(configService, 'get').mockReturnValue('15000');

      const timeout = service.getOAuthTimeout();

      expect(timeout).toBe(15000);
      expect(configService.get).toHaveBeenCalledWith('OAUTH_TIMEOUT_MS');
    });
  });
});
