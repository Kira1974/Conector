export class KeyResolutionExamples {
  //200
  static readonly SUCCESS_RESPONSES = {
    alphanumericKey: {
      summary: 'Alphanumeric key resolution',
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
        responseCode: 'SUCCESS'
      }
    },
    mobileKey: {
      summary: 'Mobile number key resolution',
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
        responseCode: 'SUCCESS'
      }
    },
    emailKey: {
      summary: 'Email key resolution',
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
        responseCode: 'SUCCESS'
      }
    },
    businessKey: {
      summary: 'Business code key resolution (Legal person)',
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
        responseCode: 'SUCCESS'
      }
    }
  };

  //404
  static readonly NOT_FOUND_RESPONSES = {
    keyNotFound: {
      summary: 'Key does not exist or is canceled (DIFE-0004)',
      value: {
        key: 'key_not_found',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key does not exist or is canceled.',
        networkCode: 'DIFE-0004',
        networkMessage: 'DIFE: The key does not exist or is canceled.'
      }
    }
  };

  //422
  static readonly UNPROCESSABLE_ENTITY_RESPONSES = {
    keySuspendedByClient: {
      summary: 'Key suspended by client (DIFE-0005)',
      value: {
        key: 'key_suspended',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The key is suspended.',
        networkCode: 'DIFE-0005',
        networkMessage: 'DIFE: The key is suspended by the client.'
      }
    },
    keySuspendedByParticipant: {
      summary: 'Key suspended by participant (DIFE-0006)',
      value: {
        key: 'key_suspended_participant',
        keyType: 'O',
        responseCode: 'REJECTED_BY_PROVIDER',
        message: 'The key is suspended.',
        networkCode: 'DIFE-0006',
        networkMessage: 'DIFE: The key is suspended by the participant.'
      }
    },
    invalidKeyFormat: {
      summary: 'Invalid key format (DIFE-4000)',
      value: {
        key: '@INVALIDKEY',
        keyType: 'O',
        responseCode: 'REJECTED_BY_PROVIDER',
        message: 'Invalid key format.',
        networkCode: 'DIFE-4000',
        networkMessage: 'DIFE: Invalid key format.'
      }
    },
    invalidEmailFormat: {
      summary: 'Invalid email format (DIFE-5005)',
      value: {
        key: 'invalid_key_5005',
        keyType: 'E',
        responseCode: 'REJECTED_BY_PROVIDER',
        message: 'Invalid key format.',
        networkCode: 'DIFE-5005',
        networkMessage:
          'DIFE: The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.'
      }
    }
  };

  //502
  static readonly BAD_GATEWAY_RESPONSES = {
    difeUnexpectedError: {
      summary: 'DIFE unexpected error (DIFE-9999)',
      value: {
        key: 'dife_9999',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'An unexpected error occurred.',
        networkCode: 'DIFE-9999',
        networkMessage: 'DIFE: An unexpected error occurred.'
      }
    },
    difeDiceError: {
      summary: 'DIFE DICE API error (DIFE-0008)',
      value: {
        key: 'dife_0008',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'An unexpected error occurred in the DICE API.',
        networkCode: 'DIFE-0008',
        networkMessage: 'DIFE: An unexpected error occurred in the DICE API.'
      }
    },
    difeParticipantNotFound: {
      summary: 'Participant does not exist (DIFE-5003)',
      value: {
        key: 'dife_5003',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'The participant does not exist.',
        networkCode: 'DIFE-5003',
        networkMessage: 'DIFE: The participant does not exist.'
      }
    }
  };

  //504
  static readonly GATEWAY_TIMEOUT_RESPONSES = {
    difeTimeout: {
      summary: 'DIFE timeout (DIFE-5000)',
      value: {
        key: 'dife_timeout',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'Request timeout.',
        networkCode: 'DIFE-5000',
        networkMessage: 'DIFE: Timeout.'
      }
    }
  };

  //500
  static readonly INTERNAL_SERVER_ERROR_RESPONSES = {
    charonInternalError: {
      summary: 'Charon internal error',
      value: {
        key: 'server_error',
        keyType: 'O',
        responseCode: 'ERROR',
        message: 'An error occurred processing the request.'
      }
    }
  };
}
