import { KeyType } from './key-type.util';
export interface KeyValidationResult {
    isValid: boolean;
    errorMessage?: string;
}
export declare function validateKeyFormat(keyValue: string, keyType: KeyType): KeyValidationResult;
