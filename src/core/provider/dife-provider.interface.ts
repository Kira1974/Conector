import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model/key-resolution.model';

/**
 * DIFE Provider abstract class for key resolution operations
 * Defines the contract that core layer depends on
 */
export abstract class IDifeProvider {
  /**
   * Resolve account key using DIFE API
   */
  abstract resolveKey(request: KeyResolutionRequest): Promise<KeyResolutionResponse>;
}
