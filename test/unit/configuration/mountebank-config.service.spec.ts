import { Test, TestingModule } from '@nestjs/testing';

import { MountebankConfigService } from '@config/mountebank-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('MountebankConfigService', () => {
  let service: MountebankConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MountebankConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<MountebankConfigService>(MountebankConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true when Mountebank is enabled', () => {
      genericConfig.get.mockReturnValue(true);

      const result = service.isEnabled();

      expect(result).toBe(true);
      expect(genericConfig.get).toHaveBeenCalledWith('mountebank.enabled');
    });

    it('should return false when Mountebank is disabled', () => {
      genericConfig.get.mockReturnValue(false);

      const result = service.isEnabled();

      expect(result).toBe(false);
      expect(genericConfig.get).toHaveBeenCalledWith('mountebank.enabled');
    });
  });

  describe('getOAuthPort', () => {
    it('should return OAuth port from config', () => {
      const expectedPort = 4545;
      genericConfig.get.mockReturnValue(expectedPort);

      const result = service.getOAuthPort();

      expect(result).toBe(expectedPort);
      expect(genericConfig.get).toHaveBeenCalledWith('mountebank.oauthPort');
    });
  });

  describe('getDifePort', () => {
    it('should return DIFE port from config', () => {
      const expectedPort = 4546;
      genericConfig.get.mockReturnValue(expectedPort);

      const result = service.getDifePort();

      expect(result).toBe(expectedPort);
      expect(genericConfig.get).toHaveBeenCalledWith('mountebank.difePort');
    });
  });

  describe('getMolPort', () => {
    it('should return MOL port from config', () => {
      const expectedPort = 4547;
      genericConfig.get.mockReturnValue(expectedPort);

      const result = service.getMolPort();

      expect(result).toBe(expectedPort);
      expect(genericConfig.get).toHaveBeenCalledWith('mountebank.molPort');
    });
  });
});
