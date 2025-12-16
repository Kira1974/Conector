import { Test, TestingModule } from '@nestjs/testing';

import { AppConfigService } from '@config/app-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<AppConfigService>(AppConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return port from config', () => {
    const expectedPort = 3000;
    genericConfig.get.mockReturnValue(expectedPort);

    const result = service.getPort();

    expect(result).toBe(expectedPort);
    expect(genericConfig.get).toHaveBeenCalledWith('app.port');
  });
});
