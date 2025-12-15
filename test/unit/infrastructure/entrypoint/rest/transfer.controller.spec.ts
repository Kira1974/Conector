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
      transactionId: 'TXN-TEST-123',
      transaction: {
        amount: {
          value: 100000,
          currency: 'COP'
        },
        description: 'Test transfer'
      },
      transactionParties: {
        payee: {
          accountInfo: {
            value: '3001234567'
          }
        }
      },
      additionalData: {}
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
      expect(mockResponse.json).toHaveBeenCalledWith(mockResponseDto);
      expect(transferUseCase.executeTransfer).toHaveBeenCalledWith(mockRequest);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Request',
        expect.objectContaining({
          method: 'POST',
          transactionId: mockRequest.transactionId,
          amount: mockRequest.transaction.amount.value,
          currency: mockRequest.transaction.amount.currency
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Response',
        expect.objectContaining({
          status: 200,
          transactionId: mockResponseDto.transactionId,
          responseCode: mockResponseDto.responseCode
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
      expect(mockResponse.json).toHaveBeenCalledWith(mockErrorResponse);
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
          transactionId: mockRequest.transactionId,
          amount: 100000,
          currency: 'COP'
        })
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'CHARON Response',
        expect.objectContaining({
          status: 200,
          transactionId: mockResponseDto.transactionId,
          responseCode: mockResponseDto.responseCode
        })
      );
    });
  });
});
