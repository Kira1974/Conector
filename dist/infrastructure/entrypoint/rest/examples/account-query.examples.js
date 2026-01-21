"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQueryExamples = void 0;
const constant_1 = require("../../../../core/constant");
class AccountQueryExamples {
}
exports.AccountQueryExamples = AccountQueryExamples;
AccountQueryExamples.SUCCESS_RESPONSES = {
    successfulQuery: {
        summary: 'Consulta exitosa de cuenta',
        value: {
            code: '201',
            message: 'Key resolved successfully',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.SUCCESSFUL,
                userData: {
                    name: 'Pepito Perez',
                    personType: 'N',
                    documentType: 'CC',
                    documentNumber: '350356109',
                    account: {
                        type: 'CAHO',
                        number: '123123123123',
                        detail: {
                            KEY_VALUE: '12312313',
                            BREB_DIFE_EXECUTION_ID: '123123123',
                            BREB_DIFE_CORRELATION_ID: '12313132',
                            BREB_DIFE_TRACE_ID: '212121',
                            BREB_KEY_TYPE: 'M',
                            BREB_PARTICIPANT_NIT: '12312313123',
                            BREB_PARTICIPANT_SPBVI: 'CRED'
                        }
                    }
                }
            }
        }
    }
};
AccountQueryExamples.VALIDATION_FAILED_RESPONSES = {
    invalidKeyFormat: {
        summary: 'Formato de llave inválido (DIFE-5005)',
        value: {
            code: '400',
            message: 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.VALIDATION_FAILED,
                networkCode: 'DIFE-5005',
                networkMessage: 'DIFE: Invalid key format',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'invalid_key',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    },
    invalidKeyFormatDife4000: {
        summary: 'Formato de llave inválido (DIFE-4000)',
        value: {
            code: '400',
            message: 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.VALIDATION_FAILED,
                networkCode: 'DIFE-4000',
                networkMessage: 'DIFE: Invalid key format',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'invalid_key',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    }
};
AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES = {
    keyNotFound: {
        summary: 'La llave no existe o está cancelada (DIFE-0004)',
        value: {
            code: '422',
            message: 'The key does not exist or is canceled.',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.REJECTED_BY_PROVIDER,
                networkCode: 'DIFE-0004',
                networkMessage: 'DIFE: The key does not exist or is canceled.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'key_not_found',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'M'
                        }
                    }
                }
            }
        }
    },
    keySuspendedByClient: {
        summary: 'Llave suspendida por el cliente (DIFE-0005)',
        value: {
            code: '422',
            message: 'The key is suspended by the client.',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.REJECTED_BY_PROVIDER,
                networkCode: 'DIFE-0005',
                networkMessage: 'DIFE: The key is suspended by the client.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'key_suspended',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'O'
                        }
                    }
                }
            }
        }
    },
    keySuspendedByParticipant: {
        summary: 'Llave suspendida por el participante (DIFE-0006)',
        value: {
            code: '422',
            message: 'The key is suspended by the participant.',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.REJECTED_BY_PROVIDER,
                networkCode: 'DIFE-0006',
                networkMessage: 'DIFE: The key is suspended by the participant.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'key_suspended_participant',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'O'
                        }
                    }
                }
            }
        }
    },
    keyCanceled: {
        summary: 'Llave cancelada (DIFE-5009)',
        value: {
            code: '422',
            message: 'The key does not exist or is canceled.',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.REJECTED_BY_PROVIDER,
                networkCode: 'DIFE-5009',
                networkMessage: 'DIFE: The key does not exist or is canceled.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'key_canceled',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'M'
                        }
                    }
                }
            }
        }
    }
};
AccountQueryExamples.PROVIDER_ERROR_RESPONSES = {
    difeTimeout: {
        summary: 'Tiempo de respuesta agotado de DIFE (DIFE-5000)',
        value: {
            code: '502',
            message: 'Request timeout',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.PROVIDER_ERROR,
                networkCode: 'DIFE-5000',
                networkMessage: 'DIFE: Timeout.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'dife_timeout',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    },
    difeUnexpectedError: {
        summary: 'Error inesperado de DIFE (DIFE-9999)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.PROVIDER_ERROR,
                networkCode: 'DIFE-9999',
                networkMessage: 'DIFE: An unexpected error occurred.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'dife_9999',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    },
    diceApiError: {
        summary: 'Error de la API DICE (DIFE-0008)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.PROVIDER_ERROR,
                networkCode: 'DIFE-0008',
                networkMessage: 'DIFE: An unexpected error occurred in the DICE API',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'dife_0008',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    },
    participantNotFound: {
        summary: 'Participante no existe (DIFE-5003)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            data: {
                externalTransactionId: 'dife-execution-id',
                state: constant_1.AccountQueryState.PROVIDER_ERROR,
                networkCode: 'DIFE-5003',
                networkMessage: 'DIFE: The participant does not exist.',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'dife_5003',
                            BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                            BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                            BREB_DIFE_TRACE_ID: 'dife-trace-id',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    }
};
AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES = {
    charonInternalError: {
        summary: 'Error interno de Charon',
        value: {
            code: '500',
            message: 'Unknown error in payment network',
            data: {
                state: constant_1.AccountQueryState.ERROR,
                networkMessage: 'Key resolution failed for key server_error: Request failed with status code 500',
                userData: {
                    account: {
                        detail: {
                            KEY_VALUE: 'server_error',
                            BREB_KEY_TYPE: 'NRIC'
                        }
                    }
                }
            }
        }
    }
};
//# sourceMappingURL=account-query.examples.js.map