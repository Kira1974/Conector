import { Test, TestingModule } from '@nestjs/testing';

import { TransferConfigService } from '@config/transfer-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('TransferConfigService', () => {
  let service: TransferConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<TransferConfigService>(TransferConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTransferTimeout', () => {
    it('should return transfer timeout from config', () => {
      const expectedTimeout = 60000;
      genericConfig.get.mockReturnValue(expectedTimeout);

      const result = service.getTransferTimeout();

      expect(result).toBe(expectedTimeout);
      expect(genericConfig.get).toHaveBeenCalledWith('transfer.timeoutMs');
    });
  });

  describe('getWebhookPollingStartDelay', () => {
    it('should return webhook polling start delay from config', () => {
      const expectedDelay = 2000;
      genericConfig.get.mockReturnValue(expectedDelay);

      const result = service.getWebhookPollingStartDelay();

      expect(result).toBe(expectedDelay);
      expect(genericConfig.get).toHaveBeenCalledWith('transfer.webhookPollingStartDelayMs');
    });
  });

  describe('getPollingInterval', () => {
    it('should return polling interval from config', () => {
      const expectedInterval = 5000;
      genericConfig.get.mockReturnValue(expectedInterval);

      const result = service.getPollingInterval();

      expect(result).toBe(expectedInterval);
      expect(genericConfig.get).toHaveBeenCalledWith('transfer.pollingIntervalMs');
    });
  });

  describe('isPollingEnabled', () => {
    it('should return true when polling is enabled', () => {
      genericConfig.get.mockReturnValue(true);

      const result = service.isPollingEnabled();

      expect(result).toBe(true);
      expect(genericConfig.get).toHaveBeenCalledWith('transfer.enablePolling');
    });

    it('should return false when polling is disabled', () => {
      genericConfig.get.mockReturnValue(false);

      const result = service.isPollingEnabled();

      expect(result).toBe(false);
      expect(genericConfig.get).toHaveBeenCalledWith('transfer.enablePolling');
    });
  });
});
