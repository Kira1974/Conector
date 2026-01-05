export class KeyResolutionExamples {
  static readonly SUCCESS_RESPONSES = {
    alphanumericKey: {
      summary: 'Resolución de llave alfanumérica',
      value: {
        documentNumber: '123143455',
        documentType: 'CC',
        personName: 'Jua*** Car*** Pér*** Góm***',
        personType: 'N',
        financialEntityNit: '12345678',
        accountType: 'CAHO',
        accountNumber: '*******890123',
        key: '@COLOMBIA',
        keyType: 'O',
        responseCode: 'SUCCESS',
        message: 'Key resolved successfully'
      }
    },
    mobileKey: {
      summary: 'Resolución de llave de número móvil',
      value: {
        documentNumber: '1098765432',
        documentType: 'CC',
        personName: 'Ana*** Mar*** Rod*** Lop***',
        personType: 'N',
        financialEntityNit: '12345678',
        accountType: 'CAHO',
        accountNumber: '*******543210',
        key: '3001234567',
        keyType: 'M',
        responseCode: 'SUCCESS',
        message: 'Key resolved successfully'
      }
    },
    emailKey: {
      summary: 'Resolución de llave de correo electrónico',
      value: {
        documentNumber: '987654321',
        documentType: 'CE',
        personName: 'Car*** Men***',
        personType: 'N',
        financialEntityNit: '12345678',
        accountType: 'CCTE',
        accountNumber: '*******333222',
        key: 'TEST@EXAMPLE.COM',
        keyType: 'E',
        responseCode: 'SUCCESS',
        message: 'Key resolved successfully'
      }
    },
    businessKey: {
      summary: 'Resolución de código de comercio (Persona jurídica)',
      value: {
        documentNumber: '900123456',
        documentType: 'NIT',
        personName: 'COM*** EJE*** SAS***',
        personType: 'L',
        financialEntityNit: '900123456',
        accountType: 'CCTE',
        accountNumber: '*******334444',
        key: '0012345678',
        keyType: 'B',
        responseCode: 'SUCCESS',
        message: 'Key resolved successfully'
      }
    }
  };

  static readonly BAD_REQUEST_RESPONSES = {
    invalidKeyFormat: {
      summary: 'Formato de llave inválido (DIFE-4000)',
      value: {
        key: '@INVALIDKEY',
        keyType: 'O',
        responseCode: 'VALIDATION_FAILED',
        message:
          'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
        networkCode: 'DIFE-4000',
        networkMessage: 'DIFE: Invalid key format (DIFE-4000)'
      }
    },
    invalidEmailFormat: {
      summary: 'Formato de email inválido (DIFE-5005)',
      value: {
        key: 'invalid_key_5005',
        keyType: 'E',
        responseCode: 'VALIDATION_FAILED',
        message:
          'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
        networkCode: 'DIFE-5005',
        networkMessage:
          'DIFE: The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure. (DIFE-5005)'
      }
    }
  };

  static readonly NOT_FOUND_RESPONSES = {
    keyNotFound: {
      summary: 'La llave no existe o está cancelada (DIFE-0004)',
      value: {
        key: 'key_not_found',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key does not exist or is canceled.',
        networkCode: 'DIFE-0004',
        networkMessage: 'DIFE: The key does not exist or is canceled. (DIFE-0004)'
      }
    }
  };

  static readonly UNPROCESSABLE_ENTITY_RESPONSES = {
    keySuspendedByClient: {
      summary: 'Llave suspendida por el cliente (DIFE-0005)',
      value: {
        key: 'key_suspended',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key is suspended by the client.',
        networkCode: 'DIFE-0005',
        networkMessage: 'DIFE: The key is suspended by the client. (DIFE-0005)'
      }
    },
    keySuspendedByParticipant: {
      summary: 'Llave suspendida por el participante (DIFE-0006)',
      value: {
        key: 'key_suspended_participant',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key is suspended by the participant.',
        networkCode: 'DIFE-0006',
        networkMessage: 'DIFE: The key is suspended by the participant. (DIFE-0006)'
      }
    }
  };

  static readonly BAD_GATEWAY_RESPONSES = {
    difeUnexpectedError: {
      summary: 'Error inesperado de DIFE (DIFE-9999)',
      value: {
        key: 'dife_9999',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Key resolution failed',
        networkCode: 'DIFE-9999',
        networkMessage: 'DIFE: An unexpected error occurred. (DIFE-9999)'
      }
    },
    diceApiError: {
      summary: 'Error de la API DICE (DIFE-0008)',
      value: {
        key: 'dife_0008',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Key resolution failed',
        networkCode: 'DIFE-0008',
        networkMessage: 'DIFE: An unexpected error occurred in the DICE API (DIFE-0008)'
      }
    },
    participantNotFound: {
      summary: 'Participante no existe (DIFE-5003)',
      value: {
        key: 'dife_5003',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Key resolution failed',
        networkCode: 'DIFE-5003',
        networkMessage: 'DIFE: The participant does not exist. (DIFE-5003)'
      }
    }
  };

  static readonly GATEWAY_TIMEOUT_RESPONSES = {
    difeTimeout: {
      summary: 'Tiempo de respuesta agotado de DIFE (DIFE-5000)',
      value: {
        key: 'dife_timeout',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Request timeout',
        networkCode: 'DIFE-5000',
        networkMessage: 'DIFE: Timeout. (DIFE-5000)'
      }
    }
  };

  static readonly INTERNAL_SERVER_ERROR_RESPONSES = {
    charonInternalError: {
      summary: 'Error interno de Charon',
      value: {
        key: 'server_error',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Unknown error in key resolution network',
        networkMessage: 'Key resolution failed for key server_error: Request failed with status code 500'
      }
    }
  };
}
