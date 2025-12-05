import { TransferConfirmationController } from '@infrastructure/entrypoint/rest/transfer-confirmation.controller';
import { ConfirmationUseCase } from '@core/usecase/confirmation.usecase';
import { TransferConfirmationDto } from '@infrastructure/entrypoint/dto';
import { ConfirmationResponse } from '@core/model';
import { TransferFinalState } from '@core/constant';

describe('TransferConfirmationController', () => {
  let controller: TransferConfirmationController;
  let mockConfirmationUseCase: jest.Mocked<ConfirmationUseCase>;

  beforeEach(() => {
    mockConfirmationUseCase = {
      processConfirmation: jest.fn()
    } as any;

    controller = new TransferConfirmationController(mockConfirmationUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConfirmation', () => {
    it('should delegate to ConfirmationUseCase and return response', () => {
      const notification: TransferConfirmationDto = {
        id: 'NOTIF-001',
        source: 'credibanco',
        status: 'received',
        payload: {
          event_name: 'settlement.completed',
          event_type: 'settlement',
          payload: {
            execution_id: 'EXEC-123',
            end_to_end_id: 'E2E-123',
            status: 'SUCCESS',
            errors: [],
            qr_code_id: 'QR-001',
            time_marks: {}
          },
          properties: {
            event_date: '2024-11-24T20:00:00Z',
            trace_id: 'TRACE-001'
          }
        }
      };

      const expectedResponse: ConfirmationResponse = {
        transactionId: 'E2E-123',
        responseCode: TransferFinalState.APPROVED,
        message: 'Payment approved',
        externalTransactionId: 'E2E-123',
        additionalData: {
          END_TO_END: 'E2E-123',
          EXECUTION_ID: 'EXEC-123'
        }
      };

      mockConfirmationUseCase.processConfirmation.mockReturnValue(expectedResponse);

      const result = controller.handleConfirmation(notification);

      expect(result).toEqual(expectedResponse);
      expect(mockConfirmationUseCase.processConfirmation).toHaveBeenCalledWith(notification);
    });

    it('should return error response for unknown status', () => {
      const notification: TransferConfirmationDto = {
        id: 'NOTIF-002',
        source: 'credibanco',
        status: 'received',
        payload: {
          event_name: 'settlement.unknown',
          event_type: 'settlement',
          payload: {
            execution_id: 'EXEC-BAD',
            end_to_end_id: 'E2E-BAD',
            status: 'UNKNOWN_STATUS',
            errors: [
              {
                code: 'ERR-001',
                description: 'Invalid status'
              }
            ],
            time_marks: {}
          },
          properties: {
            event_date: '2024-11-24T20:00:00Z',
            trace_id: 'TRACE-002'
          }
        }
      };

      const expectedResponse: ConfirmationResponse = {
        transactionId: 'E2E-BAD',
        responseCode: TransferFinalState.ERROR,
        message: 'ERR-001: Invalid status',
        externalTransactionId: 'E2E-BAD',
        additionalData: {
          END_TO_END: 'E2E-BAD',
          EXECUTION_ID: 'EXEC-BAD'
        }
      };

      mockConfirmationUseCase.processConfirmation.mockReturnValue(expectedResponse);

      const result = controller.handleConfirmation(notification);

      expect(result).toEqual(expectedResponse);
      expect(mockConfirmationUseCase.processConfirmation).toHaveBeenCalledWith(notification);
    });

    it('should return pending response when transfer not found', () => {
      const notification: TransferConfirmationDto = {
        id: 'NOTIF-003',
        source: 'credibanco',
        status: 'received',
        payload: {
          event_name: 'settlement.completed',
          event_type: 'settlement',
          payload: {
            execution_id: 'EXEC-UNKNOWN',
            end_to_end_id: 'E2E-UNKNOWN',
            status: 'SUCCESS',
            errors: [],
            time_marks: {}
          },
          properties: {
            event_date: '2024-11-24T20:00:00Z',
            trace_id: 'TRACE-003'
          }
        }
      };

      const expectedResponse: ConfirmationResponse = {
        transactionId: 'E2E-UNKNOWN',
        responseCode: TransferFinalState.PENDING,
        message: 'Payment pending',
        externalTransactionId: 'E2E-UNKNOWN',
        additionalData: {
          END_TO_END: 'E2E-UNKNOWN',
          EXECUTION_ID: 'EXEC-UNKNOWN'
        }
      };

      mockConfirmationUseCase.processConfirmation.mockReturnValue(expectedResponse);

      const result = controller.handleConfirmation(notification);

      expect(result).toEqual(expectedResponse);
      expect(mockConfirmationUseCase.processConfirmation).toHaveBeenCalledWith(notification);
    });
  });
});
