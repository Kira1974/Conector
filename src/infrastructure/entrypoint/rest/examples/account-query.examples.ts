import { AccountQueryState } from '@core/constant';

export class AccountQueryExamples {
  static readonly SUCCESS_RESPONSES = {
    successfulQuery: {
      summary: 'Successful account query',
      value: {
        code: 201,
        message: 'Key resolved successfully',
        data: {
          externalTransactionId: 'dife-execution-id',
          state: AccountQueryState.SUCCESSFUL,
          userData: {
            name: 'John Doe',
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

  static readonly VALIDATION_FAILED_RESPONSES = {
    invalidKeyFormat: {
      summary: 'Invalid key format (DIFE-5005)',
      value: {
        code: 400,
        message:
          'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
        data: {
          state: AccountQueryState.VALIDATION_FAILED,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-5005',
          networkMessage: 'DIFE: Invalid key format',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'invalid_key',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    invalidKeyFormatDife4000: {
      summary: 'Invalid key format (DIFE-4000)',
      value: {
        code: 400,
        message:
          'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
        data: {
          state: AccountQueryState.VALIDATION_FAILED,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-4000',
          networkMessage: 'DIFE: Invalid key format',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'invalid_key',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    adapterValidationError: {
      summary: 'Adapter validation error (no networkMessage)',
      value: {
        code: 400,
        message:
          'Invalid key format. Valid formats: Alphanumeric (@[A-Z0-9]{5-20}), Mobile (3[0-9]{9}), Email (user@domain.com, 3-92 chars), Commerce Code (00[0-9]{8}), or Identification Number ([A-Z0-9]{1-18})',
        data: {
          state: AccountQueryState.VALIDATION_FAILED,
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'invalid_key',
                BREB_KEY_TYPE: 'NRIC'
              }
            }
          }
        }
      }
    }
  };

  static readonly REJECTED_BY_PROVIDER_RESPONSES = {
    keyNotFound: {
      summary: 'Key does not exist or is canceled (DIFE-0004)',
      value: {
        code: 422,
        message: 'The key does not exist or is canceled.',
        data: {
          state: AccountQueryState.REJECTED_BY_PROVIDER,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-0004',
          networkMessage: 'DIFE: The key does not exist or is canceled.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'key_not_found',
                BREB_KEY_TYPE: 'M',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    keySuspendedByClient: {
      summary: 'Key suspended by client (DIFE-0005)',
      value: {
        code: 422,
        message: 'The key is suspended by the client.',
        data: {
          state: AccountQueryState.REJECTED_BY_PROVIDER,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-0005',
          networkMessage: 'DIFE: The key is suspended by the client.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'key_suspended',
                BREB_KEY_TYPE: 'O',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    keySuspendedByParticipant: {
      summary: 'Key suspended by participant (DIFE-0006)',
      value: {
        code: 422,
        message: 'The key is suspended by the participant.',
        data: {
          state: AccountQueryState.REJECTED_BY_PROVIDER,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-0006',
          networkMessage: 'DIFE: The key is suspended by the participant.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'key_suspended_participant',
                BREB_KEY_TYPE: 'O',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    keyCanceled: {
      summary: 'Key canceled (DIFE-5009)',
      value: {
        code: 422,
        message: 'The key does not exist or is canceled.',
        data: {
          state: AccountQueryState.REJECTED_BY_PROVIDER,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-5009',
          networkMessage: 'DIFE: The key does not exist or is canceled.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'key_canceled',
                BREB_KEY_TYPE: 'M',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    }
  };

  static readonly PROVIDER_ERROR_RESPONSES = {
    difeTimeout: {
      summary: 'DIFE timeout (DIFE-5000)',
      value: {
        code: 502,
        message: 'Request timeout',
        data: {
          state: AccountQueryState.PROVIDER_ERROR,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-5000',
          networkMessage: 'DIFE: Timeout.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'dife_timeout',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    difeUnexpectedError: {
      summary: 'DIFE unexpected error (DIFE-9999)',
      value: {
        code: 502,
        message: 'Key resolution failed',
        data: {
          state: AccountQueryState.PROVIDER_ERROR,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-9999',
          networkMessage: 'DIFE: An unexpected error occurred.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'dife_9999',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    diceApiError: {
      summary: 'DICE API error (DIFE-0008)',
      value: {
        code: 502,
        message: 'Key resolution failed',
        data: {
          state: AccountQueryState.PROVIDER_ERROR,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-0008',
          networkMessage: 'DIFE: An unexpected error occurred in the DICE API',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'dife_0008',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    },
    participantNotFound: {
      summary: 'Participant does not exist (DIFE-5003)',
      value: {
        code: 502,
        message: 'Key resolution failed',
        data: {
          state: AccountQueryState.PROVIDER_ERROR,
          externalTransactionId: 'dife-execution-id',
          networkCode: 'DIFE-5003',
          networkMessage: 'DIFE: The participant does not exist.',
          userData: {
            account: {
              detail: {
                KEY_VALUE: 'dife_5003',
                BREB_KEY_TYPE: 'NRIC',
                BREB_DIFE_EXECUTION_ID: 'dife-execution-id',
                BREB_DIFE_CORRELATION_ID: 'dife-correlation-id',
                BREB_DIFE_TRACE_ID: 'dife-trace-id'
              }
            }
          }
        }
      }
    }
  };

  static readonly INTERNAL_SERVER_ERROR_RESPONSES = {
    charonInternalError: {
      summary: 'Charon internal error',
      value: {
        code: 500,
        message: 'Unknown error in key resolution network',
        data: {
          state: AccountQueryState.ERROR,
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
}
