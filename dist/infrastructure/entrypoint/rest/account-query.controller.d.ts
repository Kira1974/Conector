import { ThLoggerService } from 'themis';
import { AccountQueryUseCase } from '@core/usecase/account-query.usecase';
import { AccountQueryRequestDto, AccountQueryResponseDto } from '../dto';
export declare class AccountQueryController {
    private readonly accountQueryUseCase;
    private readonly loggerService;
    private readonly logger;
    constructor(accountQueryUseCase: AccountQueryUseCase, loggerService: ThLoggerService);
    queryAccount(request: AccountQueryRequestDto): Promise<AccountQueryResponseDto>;
}
