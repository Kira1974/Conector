export declare class KeyResolutionExamples {
    static readonly SUCCESS_RESPONSES: {
        alphanumericKey: {
            summary: string;
            value: {
                documentNumber: string;
                documentType: string;
                personName: string;
                personType: string;
                financialEntityNit: string;
                accountType: string;
                accountNumber: string;
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
            };
        };
        mobileKey: {
            summary: string;
            value: {
                documentNumber: string;
                documentType: string;
                personName: string;
                personType: string;
                financialEntityNit: string;
                accountType: string;
                accountNumber: string;
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
            };
        };
        emailKey: {
            summary: string;
            value: {
                documentNumber: string;
                documentType: string;
                personName: string;
                personType: string;
                financialEntityNit: string;
                accountType: string;
                accountNumber: string;
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
            };
        };
        businessKey: {
            summary: string;
            value: {
                documentNumber: string;
                documentType: string;
                personName: string;
                personType: string;
                financialEntityNit: string;
                accountType: string;
                accountNumber: string;
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
            };
        };
    };
    static readonly BAD_REQUEST_RESPONSES: {
        invalidKeyFormat: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
        invalidEmailFormat: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
    };
    static readonly NOT_FOUND_RESPONSES: {
        keyNotFound: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
    };
    static readonly UNPROCESSABLE_ENTITY_RESPONSES: {
        keySuspendedByClient: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
        keySuspendedByParticipant: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
    };
    static readonly BAD_GATEWAY_RESPONSES: {
        difeUnexpectedError: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
        diceApiError: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
        participantNotFound: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
    };
    static readonly GATEWAY_TIMEOUT_RESPONSES: {
        difeTimeout: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkCode: string;
                networkMessage: string;
            };
        };
    };
    static readonly INTERNAL_SERVER_ERROR_RESPONSES: {
        charonInternalError: {
            summary: string;
            value: {
                key: string;
                keyType: string;
                responseCode: string;
                message: string;
                networkMessage: string;
            };
        };
    };
}
