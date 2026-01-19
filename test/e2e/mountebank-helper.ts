interface MounteBankManager {
  startMountebank(): Promise<void>;
  createImposter(stubs: unknown[], servicePort: string): Promise<unknown>;
  stopMountebank(): Promise<void>;
  clearAllImposters(): Promise<void>;
}

type BuildStubFunction = (
  path: string,
  method: string,
  responseBody: unknown,
  statusCode: number,
  predicates?: unknown[]
) => unknown;

export interface MountebankConfig {
  oauthPort: number;
  difePort: number;
  molPort: number;
}

export class MountebankHelper {
  private manager: MounteBankManager;
  private buildStub: BuildStubFunction;
  private config: MountebankConfig;

  constructor(config: MountebankConfig) {
    this.config = config;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mountebankModule = require('@moka1177/mountebank-manager/dist/src/index.js') as {
      MounteBankManager: new () => MounteBankManager;
      buildStub: BuildStubFunction;
    };
    const { MounteBankManager, buildStub } = mountebankModule;
    this.manager = new MounteBankManager();
    this.buildStub = buildStub;
  }

  async start(): Promise<void> {
    await this.manager.startMountebank();
  }

  async stop(): Promise<void> {
    await this.manager.stopMountebank();
  }

  async setupOAuthImposter(scenario: 'success' | 'invalid_credentials' | 'server_error'): Promise<void> {
    const responseBody = this.getOAuthResponseBody(scenario);
    const statusCode = this.getOAuthStatusCode(scenario);
    const stub = this.buildStub('/token', 'POST', responseBody, statusCode, [
      { equals: { query: { grant_type: 'client_credentials' } } }
    ]);
    await this.manager.createImposter([stub], this.config.oauthPort.toString());
  }

  async setupDifeImposter(
    scenario: 'success' | 'invalid_key' | 'invalid_key_5005' | 'key_not_found' | 'key_suspended' | 'server_error'
  ): Promise<void> {
    const responseBody = this.getDifeResponseBody(scenario);
    const statusCode = this.getDifeStatusCode(scenario);
    const stub = this.buildStub('/v1/key/resolve', 'POST', responseBody, statusCode);
    await this.manager.createImposter([stub], this.config.difePort.toString());
  }

  async setupDifeImposterWithCustomResponse(responseBody: unknown, statusCode: number = 200): Promise<void> {
    const stub = this.buildStub('/v1/key/resolve', 'POST', responseBody, statusCode);
    await this.manager.createImposter([stub], this.config.difePort.toString());
  }

  async setupMolPaymentImposter(
    scenario:
      | 'success'
      | 'validation_error'
      | 'rejected'
      | 'server_error'
      | 'processing'
      | 'timeout_4017'
      | 'timeout_4019'
      | 'mol_5005'
      | 'mol_4003'
      | 'mol_4007'
      | 'mol_4008'
      | 'mol_4009'
      | 'mol_4010'
      | 'mol_4011'
      | 'mol_4012'
      | 'mol_4013'
      | 'mol_4014'
  ): Promise<void> {
    const responseBody = this.getMolPaymentResponseBody(scenario);
    const statusCode = this.getMolPaymentStatusCode(scenario);
    const stub = this.buildStub('/v1/payment', 'POST', responseBody, statusCode);
    await this.manager.createImposter([stub], this.config.molPort.toString());
  }

  async setupMolQueryImposter(scenario: 'success' | 'not_found' | 'server_error', endToEndId?: string): Promise<void> {
    const responseBody = this.getMolQueryResponseBody(scenario, endToEndId);
    const statusCode = this.getMolQueryStatusCode(scenario);
    const extraPredicates = endToEndId ? [{ equals: { query: { end_to_end_id: endToEndId } } }] : [];
    const stub = this.buildStub('/v1/payments', 'GET', responseBody, statusCode, extraPredicates);
    await this.manager.createImposter([stub], this.config.molPort.toString());
  }

  async setupMolCombinedImposter(
    paymentScenario:
      | 'success'
      | 'validation_error'
      | 'rejected'
      | 'server_error'
      | 'processing'
      | 'timeout_4017'
      | 'timeout_4019'
      | 'mol_5005'
      | 'mol_4003'
      | 'mol_4007'
      | 'mol_4008'
      | 'mol_4009'
      | 'mol_4010'
      | 'mol_4011'
      | 'mol_4012'
      | 'mol_4013'
      | 'mol_4014',
    queryScenario: 'success' | 'not_found' | 'server_error',
    endToEndId?: string
  ): Promise<void> {
    const paymentResponseBody = this.getMolPaymentResponseBody(paymentScenario);
    const paymentStatusCode = this.getMolPaymentStatusCode(paymentScenario);
    const paymentStub = this.buildStub('/v1/payment', 'POST', paymentResponseBody, paymentStatusCode);

    const queryResponseBody = this.getMolQueryResponseBody(queryScenario, endToEndId);
    const queryStatusCode = this.getMolQueryStatusCode(queryScenario);
    const queryExtraPredicates = endToEndId ? [{ equals: { query: { end_to_end_id: endToEndId } } }] : [];
    const queryStub = this.buildStub('/v1/payments', 'GET', queryResponseBody, queryStatusCode, queryExtraPredicates);

    await this.manager.createImposter([paymentStub, queryStub], this.config.molPort.toString());
  }

  async clearImposters(): Promise<void> {
    await this.manager.clearAllImposters();
  }

  private getOAuthResponseBody(scenario: string): unknown {
    switch (scenario) {
      case 'success':
        return {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        };
      case 'invalid_credentials':
        return {
          error: 'invalid_client',
          error_description: 'Invalid client credentials'
        };
      case 'server_error':
        return {
          error: 'Internal server error'
        };
      default:
        return this.getOAuthResponseBody('success');
    }
  }

  private getOAuthStatusCode(scenario: string): number {
    switch (scenario) {
      case 'success':
        return 200;
      case 'invalid_credentials':
        return 401;
      case 'server_error':
        return 500;
      default:
        return 200;
    }
  }

  private getDifeResponseBody(scenario: string): unknown {
    switch (scenario) {
      case 'success':
        return {
          execution_id: 'dife-execution-id-123',
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS',
          trace_id: 'dife-trace-id-123',
          key: {
            key: {
              type: 'O',
              value: '@COLOMBIA'
            },
            participant: {
              nit: '12345678',
              spbvi: 'CRB'
            },
            payment_method: {
              type: 'CAHO',
              number: '1234567890123'
            },
            person: {
              type: 'N',
              identification: {
                type: 'CC',
                number: '123143455'
              },
              name: {
                first_name: 'Juan',
                second_name: 'Carlos',
                last_name: 'Pérez',
                second_last_name: 'Gómez'
              }
            }
          },
          time_marks: {
            C110: '2023-10-30T14:45:12.345',
            C120: '2023-10-30T14:47:10.102'
          }
        };
      case 'invalid_key':
        return {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [
            {
              code: 'DIFE-4000',
              description: 'Invalid key format'
            }
          ]
        };
      case 'invalid_key_5005':
        return {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [
            {
              code: 'DIFE-5005',
              description:
                'The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.'
            }
          ]
        };
      case 'key_not_found':
        return {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [
            {
              code: 'DIFE-0004',
              description: 'The key does not exist or is canceled.'
            }
          ]
        };
      case 'key_suspended':
        return {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [
            {
              code: 'DIFE-0005',
              description: 'The key is suspended by the client.'
            }
          ]
        };
      case 'server_error':
        return {
          error: 'Internal server error'
        };
      default:
        return this.getDifeResponseBody('success');
    }
  }

  private getDifeStatusCode(scenario: string): number {
    switch (scenario) {
      case 'success':
      case 'invalid_key':
      case 'invalid_key_5005':
      case 'key_not_found':
      case 'key_suspended':
        return 200;
      case 'server_error':
        return 500;
      default:
        return 200;
    }
  }

  private getMolPaymentResponseBody(scenario: string): unknown {
    switch (scenario) {
      case 'success':
        return {
          end_to_end_id: 'mol-end-to-end-id-123',
          execution_id: 'mol-execution-id-123',
          status: 'PROCESSING'
        };
      case 'processing':
        return {
          end_to_end_id: 'mol-end-to-end-id-processing',
          execution_id: 'mol-execution-id-processing',
          status: 'PENDING'
        };
      case 'validation_error':
        return {
          status: 'ERROR',
          error: {
            code: '400',
            description: 'Validation failed',
            id: 'error-id-400'
          }
        };
      case 'rejected':
        return {
          status: 'ERROR',
          error: {
            code: '403',
            description: 'The participant id is inactive.',
            id: 'error-id-403'
          }
        };
      case 'server_error':
        return {
          error: 'Internal server error'
        };
      case 'timeout_4017':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4017',
              description: 'Time-out declared by MOL'
            }
          ]
        };
      case 'timeout_4019':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4019',
              description: 'Timeout with the account owner bank'
            }
          ]
        };
      case 'mol_5005':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-5005',
              description:
                'The field creditor.key.type has an invalid format. Must be one of IDENTIFICATION, PHONE, MAIL, ALPHANUMERIC, MERCHANT_CODE, but received MECHANT_CODE'
            }
          ]
        };
      case 'mol_4003':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4003',
              description: 'Inbound bank classifier not found'
            }
          ]
        };
      case 'mol_4007':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4007',
              description: 'Invalid account number of the Receiving Client'
            }
          ]
        };
      case 'mol_4008':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4008',
              description: 'Incorrect identification of the Receiving Client'
            }
          ]
        };
      case 'mol_4009':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4009',
              description: 'Payment method type of the Receiving Client is incorrect'
            }
          ]
        };
      case 'mol_4010':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4010',
              description: 'Receiving Client account does not exist'
            }
          ]
        };
      case 'mol_4011':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4011',
              description: 'Risk control due to suspicion of fraud'
            }
          ]
        };
      case 'mol_4012':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4012',
              description: 'Exceeds the maximum amount for low-value deposits'
            }
          ]
        };
      case 'mol_4013':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4013',
              description: 'Exceeds the maximum amount of the payment network'
            }
          ]
        };
      case 'mol_4014':
        return {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-4014',
              description: 'Exceeds the maximum amount of the Receiving Participant'
            }
          ]
        };
      default:
        return this.getMolPaymentResponseBody('success');
    }
  }

  private getMolPaymentStatusCode(scenario: string): number {
    switch (scenario) {
      case 'success':
      case 'processing':
      case 'validation_error':
      case 'rejected':
      case 'timeout_4017':
      case 'timeout_4019':
      case 'mol_5005':
      case 'mol_4003':
      case 'mol_4007':
      case 'mol_4008':
      case 'mol_4009':
      case 'mol_4010':
      case 'mol_4011':
      case 'mol_4012':
      case 'mol_4013':
      case 'mol_4014':
        return 200;
      case 'server_error':
        return 500;
      default:
        return 200;
    }
  }

  private getMolQueryResponseBody(scenario: string, endToEndId?: string): unknown {
    switch (scenario) {
      case 'success':
        return {
          items: [
            {
              end_to_end_id: endToEndId || 'mol-end-to-end-id-123',
              internal_id: 'internal-id-123',
              status: 'COMPLETED',
              transaction_amount: '100.00',
              created_at: new Date().toISOString(),
              billing_responsible: 'DEBT',
              context: 'BREB',
              creditor: {
                identification: { type: 'CITIZENSHIP_ID', value: '1234567890' },
                name: 'Jane Doe',
                participant: { id: '654987654', nit: '654987654', spbvi: 'CRB' },
                payment_method: { currency: 'COP', type: 'SAVINGS_ACCOUNT', value: '321456987' }
              },
              payer: {
                identification: { type: 'CITIZENSHIP_ID', value: '1234567890' },
                name: 'Payer Name',
                participant: { id: '123456789', nit: '123456789', spbvi: 'CRB' },
                payment_method: { currency: 'COP', type: 'SAVINGS_ACCOUNT', value: '000000000' }
              },
              qr_code_id: '',
              time_mark: {}
            }
          ],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalResults: 1
          },
          trace_id: 'query-trace-id-123',
          errors: []
        };
      case 'not_found':
        return {
          items: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalResults: 0
          },
          trace_id: 'query-trace-id-not-found',
          errors: []
        };
      case 'server_error':
        return {
          error: 'Internal server error'
        };
      default:
        return this.getMolQueryResponseBody('success', endToEndId);
    }
  }

  private getMolQueryStatusCode(scenario: string): number {
    switch (scenario) {
      case 'success':
      case 'not_found':
        return 200;
      case 'server_error':
        return 500;
      default:
        return 200;
    }
  }
}
