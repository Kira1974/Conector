import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model/key-resolution.model';
export declare abstract class IDifeProvider {
    abstract resolveKey(request: KeyResolutionRequest): Promise<KeyResolutionResponse>;
}
