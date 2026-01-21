import { ThLoggerService } from 'themis';

import { PendingTransferService } from '@core/usecase/pending-transfer.service';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
import { ConfirmationResponse } from '@core/model';
import { TransferConfigService } from '@config/transfer-config.service';
import { ExternalServicesConfigService } from '@config/external-services-config.service';

describe('PendingTransferService', () => {
  let service: PendingTransferService;
  let mockLoggerService: any;
  let mockMolProvider: any;
  let mockTransferConfig: jest.Mocked<TransferConfigService>;
  let mockExternalServicesConfig: jest.Mocked<ExternalServicesConfigService>;

  const mockLogger = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  beforeEach(() => {
    mockLoggerService = {
      getLogger: jest.fn().mockReturnValue(mockLogger)
    };

    mockMolProvider = {
      queryPaymentStatus: jest.fn()
    };

    mockTransferConfig = {
      getTransferTimeout: jest.fn().mockReturnValue(50000),
      getWebhookPollingStartDelay: jest.fn().mockReturnValue(30000),
      getPollingInterval: jest.fn().mockReturnValue(5000),
      isPollingEnabled: jest.fn().mockReturnValue(true),
      isCleanupIntervalEnabled: jest.fn().mockReturnValue(false)
    } as unknown as jest.Mocked<TransferConfigService>;

    mockExternalServicesConfig = {
      getMolQueryTimeout: jest.fn().mockReturnValue(10000)
    } as unknown as jest.Mocked<ExternalServicesConfigService>;

    service = new PendingTransferService(
      mockLoggerService as ThLoggerService,
      mockMolProvider,
      mockTransferConfig,
      mockExternalServicesConfig
    );
  });

  afterEach(() => {
    try {
      service.clearAll();
    } catch {
      // Ignore errors during cleanup
    }
    jest.clearAllMocks();
  });

  describe('waitForConfirmation', () => {
    it('should resolve with APPROVED when confirmation is received', async () => {
      const promise = service.waitForConfirmation('TXN-001', 'E2E-123');

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-123',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-123',
        additionalData: {
          END_TO_END: 'E2E-123',
          EXECUTION_ID: 'TXN-001'
        }
      };

      setTimeout(() => {
        service.resolveConfirmation('E2E-123', mockResponse);
      }, 10);

      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(mockLogger.log).toHaveBeenCalledWith('Registering pending transfer', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith('Transfer final state resolved', expect.any(Object));
    });

    it('should resolve with DECLINED when confirmation is received', async () => {
      const promise = service.waitForConfirmation('TXN-002', 'E2E-456');

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-456',
        responseCode: TransferResponseCode.REJECTED_BY_PROVIDER,
        message: 'Payment declined',
        externalTransactionId: 'E2E-456',
        additionalData: {
          END_TO_END: 'E2E-456',
          EXECUTION_ID: 'TXN-002'
        }
      };

      setTimeout(() => {
        service.resolveConfirmation('E2E-456', mockResponse);
      }, 10);

      const result = await promise;

      expect(result).toEqual(mockResponse);
    });

    it('should reject with timeout error after 50 seconds', async () => {
      jest.useFakeTimers();

      const promise = service.waitForConfirmation('TXN-003', 'E2E-789').catch((error) => error);

      jest.advanceTimersByTime(50000);
      jest.runAllTimers();

      const result = await promise;
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('The final response from the provider was never received.');
      expect(mockLogger.warn).toHaveBeenCalledWith('Transfer timeout - confirmation not received', expect.any(Object));

      jest.useRealTimers();
    });

    it('should not allow duplicate endToEndId resolution', async () => {
      const promise1 = service.waitForConfirmation('TXN-004', 'E2E-DUP');

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-DUP',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-DUP',
        additionalData: {
          END_TO_END: 'E2E-DUP',
          EXECUTION_ID: 'TXN-004'
        }
      };

      setTimeout(() => {
        const firstResolved = service.resolveConfirmation('E2E-DUP', mockResponse);
        expect(firstResolved).toBe(true);

        const secondResolved = service.resolveConfirmation('E2E-DUP', mockResponse);
        expect(secondResolved).toBe(false);
      }, 10);

      await promise1;
    });
  });

  describe('resolveConfirmation', () => {
    it('should return false for unknown endToEndId', () => {
      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-UNKNOWN',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-UNKNOWN',
        additionalData: {
          END_TO_END: 'E2E-UNKNOWN',
          EXECUTION_ID: 'TXN-UNKNOWN'
        }
      };

      const result = service.resolveConfirmation('E2E-UNKNOWN', mockResponse);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('Confirmation received for unknown or expired transfer', {
        eventId: 'E2E-UNKNOWN',
        traceId: 'E2E-UNKNOWN',
        correlationId: 'E2E-UNKNOWN',
        transactionId: 'E2E-UNKNOWN',
        endToEndId: 'E2E-UNKNOWN',
        finalState: TransferResponseCode.APPROVED,
        currentPending: 0
      });
    });

    it('should clear timeout when resolving confirmation', async () => {
      jest.useFakeTimers();

      const promise = service.waitForConfirmation('TXN-005', 'E2E-CLEAR');

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-CLEAR',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-CLEAR',
        additionalData: {
          END_TO_END: 'E2E-CLEAR',
          EXECUTION_ID: 'TXN-005'
        }
      };

      service.resolveConfirmation('E2E-CLEAR', mockResponse);

      jest.advanceTimersByTime(50000);

      const result = await promise;
      expect(result.responseCode).toBe('APPROVED');

      jest.useRealTimers();
    });
  });

  describe('getPendingCount', () => {
    it('should return number of pending transfers', () => {
      expect(service.getPendingCount()).toBe(0);

      service.waitForConfirmation('TXN-006', 'E2E-001').catch(() => undefined);
      service.waitForConfirmation('TXN-007', 'E2E-002').catch(() => undefined);
      service.waitForConfirmation('TXN-008', 'E2E-003').catch(() => undefined);

      expect(service.getPendingCount()).toBe(3);

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-001',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-001',
        additionalData: {
          END_TO_END: 'E2E-001',
          EXECUTION_ID: 'TXN-006'
        }
      };
      service.resolveConfirmation('E2E-001', mockResponse);

      expect(service.getPendingCount()).toBe(2);
    });
  });

  describe('clearAll', () => {
    it('should clear all pending transfers and their timeouts', () => {
      service.waitForConfirmation('TXN-009', 'E2E-001').catch(() => undefined);
      service.waitForConfirmation('TXN-010', 'E2E-002').catch(() => undefined);

      expect(service.getPendingCount()).toBe(2);

      service.clearAll();

      expect(service.getPendingCount()).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith('Clearing all pending transfers', {
        count: 2
      });
    });

    it('should handle errors when rejecting pending transfers during clearAll', (done) => {
      const promise = service.waitForConfirmation('TXN-ERROR', 'E2E-ERROR');

      // Immediately resolve to cause the reject to potentially throw
      promise.catch(() => {
        // Expected rejection
      });

      setTimeout(() => {
        service.clearAll();

        setTimeout(() => {
          expect(service.getPendingCount()).toBe(0);
          done();
        }, 20);
      }, 10);
    });

    it('should clear all pending transfers when count is zero', () => {
      expect(service.getPendingCount()).toBe(0);

      service.clearAll();

      expect(service.getPendingCount()).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith('Clearing all pending transfers', {
        count: 0
      });
    });
  });

  describe('duplicate endToEndId protection', () => {
    it('should reject previous transfer when duplicate endToEndId arrives', async () => {
      const promise1 = service.waitForConfirmation('TXN-011', 'E2E-DUPLICATE');

      setTimeout(() => {
        service.waitForConfirmation('TXN-012', 'E2E-DUPLICATE').catch(() => undefined);
      }, 10);

      await expect(promise1).rejects.toThrow('Duplicate request detected');
    });
  });

  describe('automatic cleanup', () => {
    it('should clean up stale transfers older than timeout + 10s', async () => {
      jest.useFakeTimers();

      service.waitForConfirmation('TXN-015', 'E2E-STALE').catch(() => undefined);

      expect(service.getPendingCount()).toBe(1);

      jest.advanceTimersByTime(50000);
      expect(service.getPendingCount()).toBe(0);

      jest.advanceTimersByTime(60000);

      await Promise.resolve();

      jest.useRealTimers();
    });

    it('should not log cleanup when no stale transfers are found', () => {
      // Create a service instance that will run cleanup
      const testService = new PendingTransferService(
        mockLoggerService as ThLoggerService,
        mockMolProvider,
        mockTransferConfig,
        mockExternalServicesConfig
      );

      // Manually trigger cleanup with no pending transfers
      (testService as any).performCleanup();

      // Should not log "Cleanup completed" when cleanedCount is 0
      const cleanupLogs = mockLogger.log.mock.calls.filter((call) => call[0] === 'Cleanup completed');
      expect(cleanupLogs).toHaveLength(0);

      testService.clearAll();
    });

    it('should log cleanup when stale transfers are cleaned', () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      service.waitForConfirmation('TXN-STALE-LOG', 'E2E-STALE-LOG').catch(() => undefined);

      expect(service.getPendingCount()).toBe(1);

      // Advance time to make transfer stale (timeout + 10s + 1ms)
      jest.setSystemTime(now + 60001);

      // Manually trigger cleanup
      (service as any).performCleanup();

      expect(service.getPendingCount()).toBe(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Cleaning up stale pending transfer',
        expect.objectContaining({
          endToEndId: 'E2E-STALE-LOG',
          transactionId: 'TXN-STALE-LOG'
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith('Cleanup completed', {
        cleanedCount: 1,
        remainingCount: 0
      });

      jest.useRealTimers();
    });

    it('should initialize cleanup interval when enabled in configuration', () => {
      const enabledTransferConfig = {
        ...mockTransferConfig,
        isCleanupIntervalEnabled: jest.fn().mockReturnValue(true)
      } as unknown as jest.Mocked<TransferConfigService>;

      const prodService = new PendingTransferService(
        mockLoggerService as ThLoggerService,
        mockMolProvider,
        enabledTransferConfig,
        mockExternalServicesConfig
      );

      // Check that cleanup interval was started
      expect((prodService as any).cleanupIntervalId).toBeDefined();

      // Clean up
      prodService.onModuleDestroy();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval and all pending transfers on module destroy', () => {
      service.waitForConfirmation('TXN-DESTROY-1', 'E2E-DESTROY-1').catch(() => undefined);
      service.waitForConfirmation('TXN-DESTROY-2', 'E2E-DESTROY-2').catch(() => undefined);

      expect(service.getPendingCount()).toBe(2);

      service.onModuleDestroy();

      expect(service.getPendingCount()).toBe(0);
      expect(mockLogger.log).toHaveBeenCalledWith('PendingTransferService shutting down', {
        eventId: 'shutdown',
        traceId: 'shutdown',
        correlationId: 'shutdown',
        pendingCount: 2
      });
    });

    it('should handle onModuleDestroy when no cleanup interval exists', () => {
      // Service in test mode doesn't start cleanup interval
      expect(service.getPendingCount()).toBe(0);

      service.onModuleDestroy();

      expect(mockLogger.log).toHaveBeenCalledWith('PendingTransferService shutting down', {
        eventId: 'shutdown',
        traceId: 'shutdown',
        correlationId: 'shutdown',
        pendingCount: 0
      });
    });
  });

  describe('error handling in completePendingConfirmation', () => {
    it('should log error if resolve throws an exception', async () => {
      const promise = service.waitForConfirmation('TXN-RESOLVE-ERROR', 'E2E-RESOLVE-ERROR');

      // Mock the internal pending transfer to throw on resolve
      const pendingTransfers = (service as any).pendingTransfers;
      const pending = pendingTransfers.get('E2E-RESOLVE-ERROR');

      if (pending) {
        const originalResolve = pending.resolve;
        pending.resolve = () => {
          throw new Error('Resolve error');
        };
      }

      const mockResponse: ConfirmationResponse = {
        transactionId: 'E2E-RESOLVE-ERROR',
        responseCode: TransferResponseCode.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-RESOLVE-ERROR',
        additionalData: {
          END_TO_END: 'E2E-RESOLVE-ERROR',
          EXECUTION_ID: 'TXN-RESOLVE-ERROR'
        }
      };
      service.resolveConfirmation('E2E-RESOLVE-ERROR', mockResponse);

      // Wait a bit for async operations
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLogger.error).toHaveBeenCalledWith('Error resolving confirmation', {
        endToEndId: 'E2E-RESOLVE-ERROR',
        error: 'Resolve error'
      });
    });
  });

  describe('duplicate endToEndId logging', () => {
    it('should log warning when duplicate endToEndId is detected', async () => {
      const promise1 = service.waitForConfirmation('TXN-DUP-LOG', 'E2E-DUP-LOG');

      setTimeout(() => {
        service.waitForConfirmation('TXN-DUP-LOG-2', 'E2E-DUP-LOG').catch(() => undefined);

        expect(mockLogger.warn).toHaveBeenCalledWith('Duplicate endToEndId detected, rejecting previous', {
          endToEndId: 'E2E-DUP-LOG',
          transactionId: 'TXN-DUP-LOG-2'
        });
      }, 10);

      await expect(promise1).rejects.toThrow('Duplicate request detected');
    });
  });

  describe('timeout configuration', () => {
    it('should use custom timeout from configuration', () => {
      const customTransferConfig = {
        getTransferTimeout: jest.fn().mockReturnValue(30000),
        getWebhookPollingStartDelay: jest.fn().mockReturnValue(30000),
        getPollingInterval: jest.fn().mockReturnValue(5000),
        isPollingEnabled: jest.fn().mockReturnValue(true),
        isCleanupIntervalEnabled: jest.fn().mockReturnValue(false)
      } as unknown as jest.Mocked<TransferConfigService>;

      const customService = new PendingTransferService(
        mockLoggerService as ThLoggerService,
        mockMolProvider,
        customTransferConfig,
        mockExternalServicesConfig
      );

      expect((customService as any).TIMEOUT_MS).toBe(30000);

      customService.clearAll();
    });

    it('should throw error when configuration is not set', () => {
      const invalidTransferConfig = {
        getTransferTimeout: jest.fn().mockImplementation(() => {
          throw new Error('Required configuration is not set');
        }),
        getWebhookPollingStartDelay: jest.fn().mockReturnValue(30000),
        getPollingInterval: jest.fn().mockReturnValue(5000),
        isPollingEnabled: jest.fn().mockReturnValue(true),
        isCleanupIntervalEnabled: jest.fn().mockReturnValue(false)
      } as unknown as jest.Mocked<TransferConfigService>;

      expect(() => {
        new PendingTransferService(
          mockLoggerService as ThLoggerService,
          mockMolProvider,
          invalidTransferConfig,
          mockExternalServicesConfig
        );
      }).toThrow();
    });
  });
});
