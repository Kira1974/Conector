import { Response } from 'express';
import { ThLoggerService } from 'themis';
import { AccountQueryUseCase } from '@core/usecase';
import { AccountQueryRequestDto } from '../dto';
export declare class AccountQueryController {
    private readonly accountQueryUseCase;
    private readonly loggerService;
    private readonly logger;
    constructor(accountQueryUseCase: AccountQueryUseCase, loggerService: ThLoggerService);
    queryAccount(request: AccountQueryRequestDto, res: Response): Promise<Response>;
}
