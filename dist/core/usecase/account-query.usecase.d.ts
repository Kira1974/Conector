import { ThLoggerService } from 'themis';
import { IDifeProvider } from '@core/provider';
import { AccountQueryResult } from '@infrastructure/entrypoint/dto/account-query-response.dto';
export declare class AccountQueryUseCase {
    private readonly difeProvider;
    private readonly loggerService;
    private readonly logger;
    constructor(difeProvider: IDifeProvider, loggerService: ThLoggerService);
    execute(key: string): Promise<AccountQueryResult>;
    private mapDifeResponseToDomain;
    private processAccountQuery;
    private buildSuccessResponse;
    private buildErrorResponse;
    private determineErrorState;
    private buildErrorResponseByNetworkCode;
    private handleError;
}
