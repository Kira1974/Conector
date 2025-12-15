import { KeyResolutionUseCase } from '@core/usecase';
import { KeyResolutionResponseDto } from '../dto';
export declare class KeyResolutionController {
    private readonly keyResolutionUseCase;
    constructor(keyResolutionUseCase: KeyResolutionUseCase);
    getKeyInformation(key: string): Promise<KeyResolutionResponseDto>;
}
