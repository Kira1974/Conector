export declare enum KeyType {
    NRIC = "NRIC",
    MOVIL = "M",
    EMAIL = "E",
    OTHERS = "O",
    COMMERCE_CODE = "B"
}
export declare function calculateKeyType(keyValue: string): KeyType;
