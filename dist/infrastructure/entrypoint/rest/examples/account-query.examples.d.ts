import { AccountQueryState } from '@core/constant';
export declare class AccountQueryExamples {
    static readonly SUCCESS_RESPONSES: {
        successfulQuery: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    externalTransactionId: string;
                    state: AccountQueryState;
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
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
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
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        invalidKeyFormatDife4000: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        adapterValidationError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                            };
                        };
                    };
                };
            };
        };
    };
    static readonly REJECTED_BY_PROVIDER_RESPONSES: {
        keyNotFound: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        keySuspendedByClient: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        keySuspendedByParticipant: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        keyCanceled: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
    };
    static readonly PROVIDER_ERROR_RESPONSES: {
        difeTimeout: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        difeUnexpectedError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        diceApiError: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
                };
            };
        };
        participantNotFound: {
            summary: string;
            value: {
                code: number;
                message: string;
                data: {
                    state: AccountQueryState;
                    externalTransactionId: string;
                    networkCode: string;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                                BREB_DIFE_EXECUTION_ID: string;
                                BREB_DIFE_CORRELATION_ID: string;
                                BREB_DIFE_TRACE_ID: string;
                            };
                        };
                    };
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
                    state: AccountQueryState;
                    networkMessage: string;
                    userData: {
                        account: {
                            detail: {
                                KEY_VALUE: string;
                                BREB_KEY_TYPE: string;
                            };
                        };
                    };
                };
            };
        };
    };
}
