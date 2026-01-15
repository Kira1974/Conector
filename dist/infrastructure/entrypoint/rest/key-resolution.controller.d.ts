import { ThLoggerService } from 'themis';
import { KeyResolutionUseCase } from '@core/usecase';
import { KeyResolutionResponseDto } from '../dto';
import { KeyResolutionParamsDto } from '../dto/key-resolution-params.dto';
export declare class KeyResolutionController {
    private readonly keyResolutionUseCase;
    private readonly loggerService;
    private readonly logger;
    constructor(keyResolutionUseCase: KeyResolutionUseCase, loggerService: ThLoggerService);
    getKeyInformation(params: KeyResolutionParamsDto): Promise<KeyResolutionResponseDto>;
}
