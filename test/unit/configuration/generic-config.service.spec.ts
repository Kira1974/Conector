import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { GenericConfigService } from '@config/generic-config.service';

describe('GenericConfigService', () => {
  let service: GenericConfigService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    service = module.get<GenericConfigService>(GenericConfigService);
    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return configuration value when it exists', () => {
      const path = 'app.port';
      const expectedValue = 3000;
      configService.get.mockReturnValue(expectedValue);

      const result = service.get<number>(path);

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should throw error when value is undefined', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(undefined);

      expect(() => service.get(path)).toThrow(`Required configuration '${path}' is not set`);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should throw error when value is null', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(null);

      expect(() => service.get(path)).toThrow(`Required configuration '${path}' is not set`);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should return string value', () => {
      const path = 'app.name';
      const expectedValue = 'test-app';
      configService.get.mockReturnValue(expectedValue);

      const result = service.get<string>(path);

      expect(result).toBe(expectedValue);
    });

    it('should return boolean value', () => {
      const path = 'feature.enabled';
      const expectedValue = true;
      configService.get.mockReturnValue(expectedValue);

      const result = service.get<boolean>(path);

      expect(result).toBe(expectedValue);
    });

    it('should return object value', () => {
      const path = 'app.config';
      const expectedValue = { key: 'value' };
      configService.get.mockReturnValue(expectedValue);

      const result = service.get<{ key: string }>(path);

      expect(result).toEqual(expectedValue);
    });
  });

  describe('getRequired', () => {
    it('should return configuration value when it exists', () => {
      const path = 'app.port';
      const expectedValue = 3000;
      configService.get.mockReturnValue(expectedValue);

      const result = service.getRequired<number>(path);

      expect(result).toBe(expectedValue);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should throw error when value is undefined', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(undefined);

      expect(() => service.getRequired(path)).toThrow(`Required configuration '${path}' is not set`);
    });
  });

  describe('has', () => {
    it('should return true when value exists', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(3000);

      const result = service.has(path);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should return false when value is undefined', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(undefined);

      const result = service.has(path);

      expect(result).toBe(false);
      expect(configService.get).toHaveBeenCalledWith(path);
    });

    it('should return true when value is null', () => {
      const path = 'app.port';
      configService.get.mockReturnValue(null);

      const result = service.has(path);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith(path);
    });
  });
});
