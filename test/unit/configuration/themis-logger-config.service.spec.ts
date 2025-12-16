import { Test, TestingModule } from '@nestjs/testing';
import { ThLogLevel } from 'themis';

import { ThemisLoggerConfigService } from '@config/themis-logger-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('ThemisLoggerConfigService', () => {
  let service: ThemisLoggerConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemisLoggerConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<ThemisLoggerConfigService>(ThemisLoggerConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoggerConfig', () => {
    it('should return logger config with all fields', () => {
      genericConfig.get
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce('INFO')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result).toEqual({
        environment: 'production',
        service: 'charon',
        version: '1.0.0',
        minimumLevel: ThLogLevel.INFO,
        format: {
          pretty: true,
          colors: true
        }
      });
      expect(genericConfig.get).toHaveBeenCalledWith('logging.pretty');
      expect(genericConfig.get).toHaveBeenCalledWith('logging.colors');
      expect(genericConfig.get).toHaveBeenCalledWith('logging.minLevel');
      expect(genericConfig.get).toHaveBeenCalledWith('logging.environment');
      expect(genericConfig.get).toHaveBeenCalledWith('logging.service');
      expect(genericConfig.get).toHaveBeenCalledWith('logging.version');
    });

    it('should map DEBUG level correctly', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('DEBUG')
        .mockReturnValueOnce('development')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result.minimumLevel).toBe(ThLogLevel.DEBUG);
    });

    it('should map WARN level correctly', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('WARN')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result.minimumLevel).toBe(ThLogLevel.WARN);
    });

    it('should map ERROR level correctly', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('ERROR')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result.minimumLevel).toBe(ThLogLevel.ERROR);
    });

    it('should handle lowercase log level', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('info')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result.minimumLevel).toBe(ThLogLevel.INFO);
    });

    it('should throw error for invalid log level', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('INVALID')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      expect(() => service.getLoggerConfig()).toThrow(
        'Invalid log level: INVALID. Must be one of: DEBUG, INFO, WARN, ERROR'
      );
    });

    it('should return format with pretty and colors disabled', () => {
      genericConfig.get
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('INFO')
        .mockReturnValueOnce('production')
        .mockReturnValueOnce('charon')
        .mockReturnValueOnce('1.0.0');

      const result = service.getLoggerConfig();

      expect(result.format.pretty).toBe(false);
      expect(result.format.colors).toBe(false);
    });
  });
});
