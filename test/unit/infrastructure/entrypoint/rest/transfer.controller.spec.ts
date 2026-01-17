import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { TransferController } from '@infrastructure/entrypoint/rest/transfer.controller';
import { TransferUseCase } from '@core/usecase';
import { TransferRequestDto, TransferResponseCode, TransferResponseDto } from '@infrastructure/entrypoint/dto';
import { TransferMessage } from '@core/constant';

describe('TransferController', () => {
  let controller: TransferController;
  let transferUseCase: jest.Mocked<TransferUseCase>;
  let mockResponse: any;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockLoggerService = {
    getLogger: jest.fn().mockReturnValue(mockLogger)
  };

  const mockTransferUseCase = {
    executeTransfer: jest.fn()
  };

  beforeEach(async () => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferUseCase,
          useValue: mockTransferUseCase
        },
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        }
      ]
    }).compile();

    controller = module.get<TransferController>(TransferController);
    transferUseCase = module.get(TransferUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transfer', () => {
    const mockRequest: TransferRequestDto = {
      transaction: {
        id: 'TXN-TEST-123',
        amount: {
          total: 100000,
          currency: 'COP'
        },
        description: 'Test transfer',
        payee: {
          account: {
            type: 'MOBILE',
            number: '3001234567'
          }
        },
        additionalData: {}
      }
    };

    it('should process transfer request successfully', async () => {
      const mockResponseDto: TransferResponseDto = {
        transactionId: 'TXN-123456789',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED,
        externalTransactionId: 'EXT-123',
        additionalData: {
          END_TO_END: 'E2E-123',
          MOL_EXECUTION_ID: 'DIFE-EXEC-123'
        }
      };

      transferUseCase.executeTransfer.mockResolvedValue(mockResponseDto);

      await controller.transfer(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 200,
        message: mockResponseDto.message,
        data: {
          state: mockResponseDto.responseCode,
          transactionId: mockResponseDto.transactionId,
          externalTransactionId: mockResponseDto.externalTransactionId,
          additionalData: mockResponseDto.additionalData
        }
      });
      expect(transferUseCase.executeTransfer).toHaveBeenCalledWith(mockRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Request',
        expect.objectContaining({
          method: 'POST',
          transactionId: mockRequest.transaction.id,
          amount: mockRequest.transaction.amount.total,
          currency: mockRequest.transaction.amount.currency
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Response',
        expect.objectContaining({
          status: 200,
          transactionId: mockResponseDto.transactionId,
          state: mockResponseDto.responseCode
        })
      );
    });

    it('should handle transfer use case errors', async () => {
      const mockErrorResponse: TransferResponseDto = {
        transactionId: 'TXN-ERROR',
        responseCode: TransferResponseCode.REJECTED_BY_PROVIDER,
        message: TransferMessage.PAYMENT_REJECTED
      };

      transferUseCase.executeTransfer.mockResolvedValue(mockErrorResponse);

      await controller.transfer(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(422);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: 422,
        message: mockErrorResponse.message,
        data: {
          state: mockErrorResponse.responseCode,
          transactionId: mockErrorResponse.transactionId
        }
      });
      expect(transferUseCase.executeTransfer).toHaveBeenCalledWith(mockRequest);
    });

    it('should log request and response details', async () => {
      const mockResponseDto: TransferResponseDto = {
        transactionId: 'TXN-123',
        responseCode: TransferResponseCode.APPROVED,
        message: TransferMessage.PAYMENT_APPROVED
      };
      transferUseCase.executeTransfer.mockResolvedValue(mockResponseDto);

      await controller.transfer(mockRequest, mockResponse);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Request',
        expect.objectContaining({
          method: 'POST',
          transactionId: mockRequest.transaction.id,
          amount: 100000,
          currency: 'COP'
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Response',
        expect.objectContaining({
          status: 200,
          transactionId: mockResponseDto.transactionId,
          state: mockResponseDto.responseCode
        })
      );
    });
  });
});
