import { Response } from 'express';
import { ThLoggerService } from 'themis';
import { TransferUseCase } from '@core/usecase';
import { TransferRequestDto } from '../dto';
export declare class TransferController {
    private readonly transferUseCase;
    private readonly loggerService;
    private readonly logger;
    constructor(transferUseCase: TransferUseCase, loggerService: ThLoggerService);
    transfer(request: TransferRequestDto, res: Response): Promise<Response>;
}
