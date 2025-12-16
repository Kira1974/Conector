import { Test, TestingModule } from '@nestjs/testing';

import { LoggingConfigService } from '@config/logging-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('LoggingConfigService', () => {
  let service: LoggingConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<LoggingConfigService>(LoggingConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return true when HTTP headers log is enabled', () => {
    genericConfig.get.mockReturnValue(true);

    const result = service.isHttpHeadersLogEnabled();

    expect(result).toBe(true);
    expect(genericConfig.get).toHaveBeenCalledWith('logging.enableHttpHeadersLog');
  });

  it('should return false when HTTP headers log is disabled', () => {
    genericConfig.get.mockReturnValue(false);

    const result = service.isHttpHeadersLogEnabled();

    expect(result).toBe(false);
    expect(genericConfig.get).toHaveBeenCalledWith('logging.enableHttpHeadersLog');
  });
});
