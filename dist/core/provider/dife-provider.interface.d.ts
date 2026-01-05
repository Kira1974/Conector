import { KeyResolutionRequest } from '@core/model/key-resolution.model';
import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
export declare abstract class IDifeProvider {
    abstract resolveKey(request: KeyResolutionRequest): Promise<DifeKeyResponseDto>;
}
