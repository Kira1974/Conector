import { DifeKeyResponseDto } from '@infrastructure/provider/http-clients/dto';
export declare function buildAdditionalDataFromKeyResolution(keyResolution: DifeKeyResponseDto): Record<string, string>;
export declare function obfuscateWord(word: string): string;
export declare function obfuscateName(name: string): string;
export declare function maskAccountNumber(accountNumber: string): string;
export declare function obfuscateKey(value: string, charsToMask?: number): string;
