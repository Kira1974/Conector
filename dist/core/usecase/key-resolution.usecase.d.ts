import { ThLoggerService } from 'themis';
import { IDifeProvider } from '@core/provider';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';
export interface KeyResolutionResult {
    response: KeyResolutionResponseDto;
    correlationId: string;
    difeExecutionId?: string;
}
export declare class KeyResolutionUseCase {
    private readonly difeProvider;
    private readonly loggerService;
    private readonly logger;
    constructor(difeProvider: IDifeProvider, loggerService: ThLoggerService);
    execute(key: string): Promise<KeyResolutionResult>;
    private mapDifeResponseToDomain;
    private processKeyResolution;
    private buildSuccessResponse;
    private buildErrorResponse;
    private determineResponseCode;
    private handleError;
}
