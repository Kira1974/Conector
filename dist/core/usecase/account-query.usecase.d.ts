import { ThLoggerService } from 'themis';
import { IDifeProvider } from '@core/provider';
import { AccountQueryResponseDto } from '@infrastructure/entrypoint/dto';
export interface AccountQueryResult {
    response: AccountQueryResponseDto;
    correlationId: string;
    difeExecutionId?: string;
    httpStatus: number;
}
export declare class AccountQueryUseCase {
    private readonly difeProvider;
    private readonly loggerService;
    private readonly logger;
    constructor(difeProvider: IDifeProvider, loggerService: ThLoggerService);
    execute(keyValue: string): Promise<AccountQueryResult>;
    private mapDifeResponseToDomain;
    private processKeyResolution;
    private buildSuccessResponse;
    private buildErrorResponse;
    private handleError;
}
