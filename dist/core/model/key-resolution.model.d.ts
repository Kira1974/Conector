export interface KeyResolutionRequest {
    correlationId: string;
    key: string;
    keyType?: string;
    transactionId?: string;
}
export interface DifePersonData {
    person?: {
        identificationNumber?: string;
        identificationType?: string;
        legalCompanyName?: string;
        firstName?: string;
        lastName?: string;
        secondName?: string;
        secondLastName?: string;
        personType?: string;
    };
    participant?: {
        nit?: string;
        spbvi?: string;
    };
    paymentMethod?: {
        number?: string;
        type?: string;
    };
}
export interface KeyResolutionResponse {
    correlationId: string;
    executionId?: string;
    traceId?: string;
    resolvedKey?: {
        keyType: string;
        keyValue: string;
        participant: {
            nit: string;
            spbvi: string;
        };
        paymentMethod: {
            number: string;
            type: string;
        };
        person: {
            identificationNumber: string;
            identificationType: string;
            legalCompanyName?: string;
            firstName?: string;
            lastName?: string;
            secondName?: string;
            secondLastName?: string;
            personType: string;
        };
    } & DifePersonData;
    status?: string;
    errors?: string[];
}
