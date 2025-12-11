import { ThLoggerService } from 'themis';

import { ConfirmationUseCase } from '@core/usecase/confirmation.usecase';
import { PendingTransferService } from '@core/usecase/pending-transfer.service';
import { TransferFinalState } from '@core/constant';
import { ConfirmationResponse } from '@core/model';
import { TransferConfirmationDto } from '@infrastructure/entrypoint/dto/transfer-confirmation.dto';

describe('ConfirmationUseCase', () => {
  let useCase: ConfirmationUseCase;
  let mockPendingTransferService: jest.Mocked<PendingTransferService>;
  let mockLoggerService: any;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  };

  beforeEach(() => {
    mockPendingTransferService = {
      waitForConfirmation: jest.fn(),
      resolveConfirmation: jest.fn(),
      getPendingCount: jest.fn(),
      clearAll: jest.fn()
    } as any;

    mockLoggerService = {
      getLogger: jest.fn().mockReturnValue(mockLogger)
    };

    useCase = new ConfirmationUseCase(mockPendingTransferService, mockLoggerService as ThLoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processConfirmation', () => {
    const createMockNotification = (
      status: string,
      endToEndId: string = '20251120135790864CRB001763694229136',
      executionId: string = '202511200BANKCRB00029a85dc48b',
      errors?: { code: string; description: string }[]
    ): TransferConfirmationDto => ({
      id: 'NOTIF-001',
      source: 'credibanco',
      status: 'RECEIVED',
      payload: {
        event_name: 'settlement.result',
        event_type: 'settlement',
        payload: {
          execution_id: executionId,
          end_to_end_id: endToEndId,
          status,
          errors,
          time_marks: {}
        },
        properties: {
          event_date: '2025-11-20T13:57:00Z',
          trace_id: 'TRACE-123'
        }
      }
    });

    it('should process SUCCESS confirmation and resolve with APPROVED', () => {
      const notification = createMockNotification('SUCCESS');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: '20251120135790864CRB001763694229136',
        responseCode: TransferFinalState.APPROVED,
        message: 'Payment approved',
        externalTransactionId: '20251120135790864CRB001763694229136',
        additionalData: {
          END_TO_END: '20251120135790864CRB001763694229136',
          EXECUTION_ID: '202511200BANKCRB00029a85dc48b'
        }
      });

      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        '20251120135790864CRB001763694229136',
        expect.objectContaining({
          transactionId: '20251120135790864CRB001763694229136',
          responseCode: TransferFinalState.APPROVED,
          message: 'Payment approved'
        }),
        'webhook'
      );

      expect(mockLogger.log).toHaveBeenCalledWith('CONFIRM Request', expect.any(Object));
      expect(mockLogger.log).toHaveBeenCalledWith('Transfer confirmation processed successfully', expect.any(Object));
    });

    it('should process SETTLED confirmation and resolve with APPROVED', () => {
      const notification = createMockNotification('SETTLED');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: '20251120135790864CRB001763694229136',
        responseCode: TransferFinalState.APPROVED,
        message: 'Payment approved',
        externalTransactionId: '20251120135790864CRB001763694229136',
        additionalData: {
          END_TO_END: '20251120135790864CRB001763694229136',
          EXECUTION_ID: '202511200BANKCRB00029a85dc48b'
        }
      });

      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        '20251120135790864CRB001763694229136',
        expect.objectContaining({
          transactionId: '20251120135790864CRB001763694229136',
          responseCode: TransferFinalState.APPROVED,
          message: 'Payment approved'
        }),
        'webhook'
      );
    });

    it('should process REJECTED confirmation and resolve with DECLINED', () => {
      const notification = createMockNotification('REJECTED');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: '20251120135790864CRB001763694229136',
        responseCode: TransferFinalState.DECLINED,
        message: 'Payment declined',
        externalTransactionId: '20251120135790864CRB001763694229136',
        additionalData: {
          END_TO_END: '20251120135790864CRB001763694229136',
          EXECUTION_ID: '202511200BANKCRB00029a85dc48b'
        }
      });

      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        '20251120135790864CRB001763694229136',
        expect.objectContaining({
          transactionId: '20251120135790864CRB001763694229136',
          responseCode: TransferFinalState.DECLINED,
          message: 'Payment declined'
        }),
        'webhook'
      );
    });

    it('should process ERROR confirmation and resolve with DECLINED', () => {
      const notification = createMockNotification('ERROR');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result.responseCode).toBe(TransferFinalState.ERROR);
      expect(result.message).toBe('Unknown settlement status');
    });

    it('should handle unknown status and return error response with errors from payload', () => {
      const errors = [
        { code: 'ERR001', description: 'Invalid account' },
        { code: 'ERR002', description: 'Insufficient funds' }
      ];
      const notification = createMockNotification('UNKNOWN_STATUS', 'E2E-123', 'EXEC-456', errors);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: 'E2E-123',
        responseCode: 'ERROR',
        message: 'ERR001: Invalid account, ERR002: Insufficient funds',
        externalTransactionId: 'E2E-123',
        additionalData: {
          END_TO_END: 'E2E-123',
          EXECUTION_ID: 'EXEC-456'
        }
      });

      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        'E2E-123',
        expect.objectContaining({
          transactionId: 'E2E-123',
          responseCode: 'ERROR',
          message: 'ERR001: Invalid account, ERR002: Insufficient funds'
        }),
        'webhook'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('Unknown settlement status received', expect.any(Object));
    });

    it('should handle unknown status without errors and return default error message', () => {
      const notification = createMockNotification('UNKNOWN_STATUS', 'E2E-789', 'EXEC-789');

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: 'E2E-789',
        responseCode: 'ERROR',
        message: 'Unknown settlement status',
        externalTransactionId: 'E2E-789',
        additionalData: {
          END_TO_END: 'E2E-789',
          EXECUTION_ID: 'EXEC-789'
        }
      });

      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        'E2E-789',
        expect.objectContaining({
          transactionId: 'E2E-789',
          responseCode: 'ERROR',
          message: 'Unknown settlement status'
        }),
        'webhook'
      );
    });

    it('should return PENDING response when transfer is not found', () => {
      const notification = createMockNotification('SUCCESS');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(false);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result).toEqual({
        transactionId: '20251120135790864CRB001763694229136',
        responseCode: 'PENDING',
        message: 'Payment pending',
        externalTransactionId: '20251120135790864CRB001763694229136',
        additionalData: {
          END_TO_END: '20251120135790864CRB001763694229136',
          EXECUTION_ID: '202511200BANKCRB00029a85dc48b'
        }
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Confirmation for unknown or expired transfer',
        expect.objectContaining({
          endToEndId: '20251120135790864CRB001763694229136',
          finalState: TransferFinalState.APPROVED
        })
      );
    });

    it('should handle case-insensitive status mapping', () => {
      const notificationLowerCase = createMockNotification('success');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notificationLowerCase);

      expect(result.responseCode).toBe(TransferFinalState.APPROVED);
      expect(mockPendingTransferService.resolveConfirmation).toHaveBeenCalledWith(
        '20251120135790864CRB001763694229136',
        expect.objectContaining({
          transactionId: '20251120135790864CRB001763694229136',
          responseCode: TransferFinalState.APPROVED,
          message: 'Payment approved'
        }),
        'webhook'
      );
    });

    it('should log all processing steps for successful confirmation', () => {
      const notification = createMockNotification('SUCCESS');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      useCase.processConfirmation(notification);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CONFIRM Request',
        expect.objectContaining({
          notificationId: 'NOTIF-001',
          source: 'credibanco',
          correlationId: '20251120135790864CRB001763694229136',
          eventId: '20251120135790864CRB001763694229136',
          executionId: '202511200BANKCRB00029a85dc48b',
          eventName: 'settlement.result'
        })
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Transfer confirmation processed successfully',
        expect.objectContaining({
          endToEndId: '20251120135790864CRB001763694229136',
          executionId: '202511200BANKCRB00029a85dc48b',
          finalState: TransferFinalState.APPROVED,
          notificationId: 'NOTIF-001'
        })
      );
    });

    it('should handle single error in payload', () => {
      const errors = [{ code: 'ERR001', description: 'Single error message' }];
      const notification = createMockNotification('INVALID', 'E2E-SINGLE', 'EXEC-SINGLE', errors);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result.message).toBe('ERR001: Single error message');
    });

    it('should handle empty errors array', () => {
      const notification = createMockNotification('INVALID', 'E2E-EMPTY', 'EXEC-EMPTY', []);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result.message).toBe('Unknown settlement status');
    });

    it('should extract correct data from notification payload', () => {
      const notification = createMockNotification('SUCCESS', 'CUSTOM-E2E', 'CUSTOM-EXEC');
      mockPendingTransferService.resolveConfirmation.mockReturnValue(true);

      const result: ConfirmationResponse = useCase.processConfirmation(notification);

      expect(result.transactionId).toBe('CUSTOM-E2E');
      expect(result.externalTransactionId).toBe('CUSTOM-E2E');
      expect(result.additionalData.END_TO_END).toBe('CUSTOM-E2E');
      expect(result.additionalData.EXECUTION_ID).toBe('CUSTOM-EXEC');
    });
  });
});
