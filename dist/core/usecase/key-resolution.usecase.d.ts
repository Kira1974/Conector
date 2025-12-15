import { ThLoggerService } from 'themis';
import { IDifeProvider } from '@core/provider';
import { KeyResolutionResponseDto } from '@infrastructure/entrypoint/dto';
export declare class KeyResolutionUseCase {
    private readonly difeProvider;
    private readonly loggerService;
    private readonly logger;
    constructor(difeProvider: IDifeProvider, loggerService: ThLoggerService);
    execute(key: string): Promise<KeyResolutionResponseDto>;
    private buildSuccessResponse;
    private buildErrorResponse;
    private handleError;
    private buildCustomMessage;
}
