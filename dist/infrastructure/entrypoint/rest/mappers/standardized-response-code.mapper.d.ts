export declare class StandardizedResponseCodeMapper {
    static mapLegacyToStandardized(legacyCode: string): string;
    static determineResponseCode(networkCode?: string): string;
    static mapToHttpStatus(responseCode: string, networkCode?: string): number;
}
