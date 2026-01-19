export declare class AccountQueryExamples {
    static readonly SUCCESS_RESPONSES: {
        alphanumericKey: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    externalTransactionId: string;
                    state: string;
                    userData: {
                        name: string;
                        personType: string;
                        documentType: string;
                        documentNumber: string;
                        account: {
                            type: string;
                            number: string;
                            detail: {
                                KEY_VALUE: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_KEY_TYPE: string;
                                BREB_PARTICIPANT_NIT: string;
                                BREB_PARTICIPANT_SPBVI: string;
                            };
                        };
                    };
                };
            };
        };
        mobileKey: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    externalTransactionId: string;
                    state: string;
                    userData: {
                        name: string;
                        personType: string;
                        documentType: string;
                        documentNumber: string;
                        account: {
                            type: string;
                            number: string;
                            detail: {
                                KEY_VALUE: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_KEY_TYPE: string;
                                BREB_PARTICIPANT_NIT: string;
                                BREB_PARTICIPANT_SPBVI: string;
                            };
                        };
                    };
                };
            };
        };
        emailKey: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    externalTransactionId: string;
                    state: string;
                    userData: {
                        name: string;
                        personType: string;
                        documentType: string;
                        documentNumber: string;
                        account: {
                            type: string;
                            number: string;
                            detail: {
                                KEY_VALUE: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_KEY_TYPE: string;
                                BREB_PARTICIPANT_NIT: string;
                                BREB_PARTICIPANT_SPBVI: string;
                            };
                        };
                    };
                };
            };
        };
        businessKey: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    externalTransactionId: string;
                    state: string;
                    userData: {
                        name: string;
                        personType: string;
                        documentType: string;
                        documentNumber: string;
                        account: {
                            type: string;
                            number: string;
                            detail: {
                                KEY_VALUE: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_KEY_TYPE: string;
                                BREB_PARTICIPANT_NIT: string;
                                BREB_PARTICIPANT_SPBVI: string;
                            };
                        };
                    };
                };
            };
        };
    };
    static readonly VALIDATION_FAILED_RESPONSES: {
        invalidKeyFormat: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
        invalidEmailFormat: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
    };
    static readonly NOT_FOUND_RESPONSES: {
        keyNotFound: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
    };
    static readonly REJECTED_BY_PROVIDER_RESPONSES: {
        keySuspendedByClient: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
        keySuspendedByParticipant: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
    };
    static readonly PROVIDER_ERROR_RESPONSES: {
        difeUnexpectedError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
        diceApiError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
        participantNotFound: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
    };
    static readonly GATEWAY_TIMEOUT_RESPONSES: {
        difeTimeout: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkCode: string;
                    networkMessage: string;
                };
            };
        };
    };
    static readonly INTERNAL_SERVER_ERROR_RESPONSES: {
        charonInternalError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    networkMessage: string;
                };
            };
        };
    };
}
