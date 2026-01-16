"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountQueryExamples = void 0;
class AccountQueryExamples {
}
exports.AccountQueryExamples = AccountQueryExamples;
AccountQueryExamples.SUCCESS_RESPONSES = {
    alphanumericKey: {
        summary: 'Resolución de llave alfanumérica',
        value: {
            code: '201',
            message: 'Key resolution successful',
            data: {
                externalTransactionId: '800227747ca675da18c35c11528d44c9f2aa22cf6a410',
                state: 'SUCCESFUL',
                userData: {
                    name: 'Juan Carlos Perez Gomez',
                    personType: 'N',
                    documentType: 'CC',
                    documentNumber: '123143455',
                    account: {
                        type: 'CAHO',
                        number: '1234567890123',
                        detail: {
                            KEY_VALUE: '@COLOMBIA',
                            BREB_DIFE_CORRELATION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a410',
                            BREB_DIFE_TRACE_ID: '212121',
                            BREB_DIFE_EXECUTION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a410',
                            BREB_KEY_TYPE: 'O',
                            BREB_PARTICIPANT_NIT: '900123456',
                            BREB_PARTICIPANT_SPBVI: 'CRED'
                        }
                    }
                }
            }
        }
    },
    mobileKey: {
        summary: 'Resolución de llave de número móvil',
        value: {
            code: '201',
            message: 'Key resolution successful',
            data: {
                externalTransactionId: '800227747ca675da18c35c11528d44c9f2aa22cf6a411',
                state: 'SUCCESFUL',
                userData: {
                    name: 'Ana Maria Rodriguez Lopez',
                    personType: 'N',
                    documentType: 'CC',
                    documentNumber: '1098765432',
                    account: {
                        type: 'CAHO',
                        number: '9876543210987',
                        detail: {
                            KEY_VALUE: '3001234567',
                            BREB_DIFE_CORRELATION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a411',
                            BREB_DIFE_TRACE_ID: '212122',
                            BREB_DIFE_EXECUTION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a411',
                            BREB_KEY_TYPE: 'M',
                            BREB_PARTICIPANT_NIT: '900123456',
                            BREB_PARTICIPANT_SPBVI: 'CRED'
                        }
                    }
                }
            }
        }
    },
    emailKey: {
        summary: 'Resolución de llave de correo electrónico',
        value: {
            code: '201',
            message: 'Key resolution successful',
            data: {
                externalTransactionId: '800227747ca675da18c35c11528d44c9f2aa22cf6a412',
                state: 'SUCCESFUL',
                userData: {
                    name: 'Carlos Mendoza',
                    personType: 'N',
                    documentType: 'CE',
                    documentNumber: '987654321',
                    account: {
                        type: 'CCTE',
                        number: '5555333222111',
                        detail: {
                            KEY_VALUE: 'TEST@EXAMPLE.COM',
                            BREB_DIFE_CORRELATION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a412',
                            BREB_DIFE_TRACE_ID: '212123',
                            BREB_DIFE_EXECUTION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a412',
                            BREB_KEY_TYPE: 'E',
                            BREB_PARTICIPANT_NIT: '900123456',
                            BREB_PARTICIPANT_SPBVI: 'CRED'
                        }
                    }
                }
            }
        }
    },
    businessKey: {
        summary: 'Resolución de código de comercio (Persona jurídica)',
        value: {
            code: '201',
            message: 'Key resolution successful',
            data: {
                externalTransactionId: '800227747ca675da18c35c11528d44c9f2aa22cf6a413',
                state: 'SUCCESFUL',
                userData: {
                    name: 'COMPAÑIA EJEMPLO SAS',
                    personType: 'L',
                    documentType: 'NIT',
                    documentNumber: '900123456',
                    account: {
                        type: 'CCTE',
                        number: '1111334444222',
                        detail: {
                            KEY_VALUE: '0012345678',
                            BREB_DIFE_CORRELATION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a413',
                            BREB_DIFE_TRACE_ID: '212124',
                            BREB_DIFE_EXECUTION_ID: '800227747ca675da18c35c11528d44c9f2aa22cf6a413',
                            BREB_KEY_TYPE: 'B',
                            BREB_PARTICIPANT_NIT: '900123456',
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
        summary: 'Formato de llave inválido (DIFE-4000)',
        value: {
            code: '400',
            message: 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
            networkCode: 'DIFE-4000',
            networkMessage: 'DIFE: Invalid key format (DIFE-4000)'
        }
    },
    invalidEmailFormat: {
        summary: 'Formato de email inválido (DIFE-5005)',
        value: {
            code: '400',
            message: 'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
            networkCode: 'DIFE-5005',
            networkMessage: 'DIFE: The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure. (DIFE-5005)'
        }
    }
};
AccountQueryExamples.NOT_FOUND_RESPONSES = {
    keyNotFound: {
        summary: 'La llave no existe o está cancelada (DIFE-0004)',
        value: {
            code: '404',
            message: 'The key does not exist or is canceled.',
            networkCode: 'DIFE-0004',
            networkMessage: 'DIFE: The key does not exist or is canceled. (DIFE-0004)'
        }
    }
};
AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES = {
    keySuspendedByClient: {
        summary: 'Llave suspendida por el cliente (DIFE-0005)',
        value: {
            code: '422',
            message: 'The key is suspended by the client.',
            networkCode: 'DIFE-0005',
            networkMessage: 'DIFE: The key is suspended by the client. (DIFE-0005)'
        }
    },
    keySuspendedByParticipant: {
        summary: 'Llave suspendida por el participante (DIFE-0006)',
        value: {
            code: '422',
            message: 'The key is suspended by the participant.',
            networkCode: 'DIFE-0006',
            networkMessage: 'DIFE: The key is suspended by the participant. (DIFE-0006)'
        }
    }
};
AccountQueryExamples.PROVIDER_ERROR_RESPONSES = {
    difeUnexpectedError: {
        summary: 'Error inesperado de DIFE (DIFE-9999)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            networkCode: 'DIFE-9999',
            networkMessage: 'DIFE: An unexpected error occurred. (DIFE-9999)'
        }
    },
    diceApiError: {
        summary: 'Error de la API DICE (DIFE-0008)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            networkCode: 'DIFE-0008',
            networkMessage: 'DIFE: An unexpected error occurred in the DICE API (DIFE-0008)'
        }
    },
    participantNotFound: {
        summary: 'Participante no existe (DIFE-5003)',
        value: {
            code: '502',
            message: 'Key resolution failed',
            networkCode: 'DIFE-5003',
            networkMessage: 'DIFE: The participant does not exist. (DIFE-5003)'
        }
    }
};
AccountQueryExamples.GATEWAY_TIMEOUT_RESPONSES = {
    difeTimeout: {
        summary: 'Tiempo de respuesta agotado de DIFE (DIFE-5000)',
        value: {
            code: '504',
            message: 'Request timeout',
            networkCode: 'DIFE-5000',
            networkMessage: 'DIFE: Timeout. (DIFE-5000)'
        }
    }
};
AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES = {
    charonInternalError: {
        summary: 'Error interno de Charon',
        value: {
            code: '500',
            message: 'Unknown error in key resolution network',
            networkMessage: 'Key resolution failed: Request failed with status code 500'
        }
    }
};
//# sourceMappingURL=account-query.examples.js.map