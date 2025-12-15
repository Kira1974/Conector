import * as http from 'http';

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

import { MountebankConfigService } from '../mountebank-config.service';
import { ExternalServicesConfigService } from '../external-services-config.service';

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

@Injectable()
export class MountebankService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MountebankService.name);
  private manager: MounteBankManager | null = null;
  private buildStub: BuildStubFunction | null = null;
  private readonly isEnabled: boolean;
  private readonly oauthPort: number | undefined;
  private readonly difePort: number | undefined;
  private readonly molPort: number | undefined;

  constructor(
    private mountebankConfig: MountebankConfigService,
    private externalServicesConfig: ExternalServicesConfigService
  ) {
    this.isEnabled = this.mountebankConfig.isEnabled();

    if (this.isEnabled) {
      this.oauthPort = this.mountebankConfig.getOAuthPort();
      this.difePort = this.mountebankConfig.getDifePort();
      this.molPort = this.mountebankConfig.getMolPort();
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mountebankModule = require('@moka1177/mountebank-manager/dist/src/index.js') as {
          MounteBankManager: new () => MounteBankManager;
          buildStub: BuildStubFunction;
        };
        const { MounteBankManager, buildStub } = mountebankModule;
        this.manager = new MounteBankManager();
        this.buildStub = buildStub;
      } catch (error) {
        this.logger.error('Error cargando @moka1177/mountebank-manager:', error);
        throw new Error('Mountebank está habilitado pero el paquete no está disponible');
      }
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  private async waitForMountebankReady(): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          const req = http.get('http://localhost:2525/imposters', (res) => {
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`Mountebank responded with status ${res.statusCode}`));
            }
          });
          req.on('error', reject);
          req.setTimeout(1000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
          });
        });
        this.logger.log('Mountebank está listo');
        return;
      } catch {
        // Mountebank aún no está listo
      }
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Mountebank no está respondiendo después de múltiples intentos');
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.log('Mountebank desactivado (mountebank.enabled=false)');
      return;
    }

    if (!this.manager) {
      return;
    }

    try {
      this.logger.log('Iniciando Mountebank...');
      await this.withTimeout(this.manager.startMountebank(), 15000, 'Mountebank start');

      this.logger.log('Esperando a que Mountebank esté listo...');
      await this.waitForMountebankReady();

      this.logger.log('Limpiando imposters existentes...');
      try {
        await this.withTimeout(this.manager.clearAllImposters(), 5000, 'Clear imposters');
      } catch {
        this.logger.warn('No se pudieron limpiar imposters existentes (puede ser normal si es la primera vez)');
      }

      this.logger.log('Configurando imposters...');
      await this.setupImposters();

      this.logger.log('Mountebank configurado y listo');
      this.logger.log(`   OAuth: ${this.externalServicesConfig.getOAuthBaseUrl()}`);
      this.logger.log(`   DIFE:  ${this.externalServicesConfig.getDifeBaseUrl()}`);
      this.logger.log(`   MOL:   ${this.externalServicesConfig.getMolBaseUrl()}`);
    } catch (error) {
      this.logger.error('Error iniciando Mountebank:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isEnabled && this.manager) {
      this.logger.log('Deteniendo Mountebank...');
      try {
        await this.manager.stopMountebank();
        this.logger.log('Mountebank detenido');
      } catch (error) {
        this.logger.error('Error deteniendo Mountebank:', error);
      }
    }
  }

  private async setupImposters(): Promise<void> {
    try {
      await this.setupOAuthImposter();
    } catch (error) {
      this.logger.error('Error configurando OAuth imposter:', error);
      throw error;
    }

    try {
      await this.setupDifeImposter();
    } catch (error) {
      this.logger.error('Error configurando DIFE imposter:', error);
      throw error;
    }

    try {
      await this.setupMolImposter();
    } catch (error) {
      this.logger.error('Error configurando MOL imposter:', error);
      throw error;
    }
  }

  private async setupOAuthImposter(): Promise<void> {
    if (!this.buildStub || !this.manager || this.oauthPort === undefined) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Configurando OAuth imposter en puerto ${this.oauthPort}...`);
    try {
      const stub = this.buildStub(
        '/token',
        'POST',
        {
          access_token: 'mock-access-token-for-testing',
          token_type: 'Bearer',
          expires_in: 3600
        },
        200,
        [{ equals: { query: { grant_type: 'client_credentials' } } }]
      );
      await this.withTimeout(
        this.manager.createImposter([stub], this.oauthPort.toString()),
        15000,
        `OAuth imposter creation on port ${this.oauthPort}`
      );
      this.logger.log(`   OAuth imposter configurado en puerto ${this.oauthPort}`);
    } catch (error) {
      this.logger.error(`Error configurando OAuth imposter en puerto ${this.oauthPort}:`, error);
      throw error;
    }
  }

  private createDifeErrorStub(errorCode: string, description: string, keyValue: string): unknown {
    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    return this.buildStub(
      '/v1/key/resolve',
      'POST',
      {
        correlation_id: 'test-correlation-id',
        execution_id: 'dife-execution-id-error',
        status: 'ERROR',
        trace_id: 'dife-trace-id-error',
        errors: [{ code: errorCode, description }]
      },
      200,
      [{ jsonpath: { selector: '$.key.value' }, equals: { body: keyValue } }]
    );
  }

  private createDifeSuccessStub(
    keyValue: string,
    executionId: string,
    traceId: string,
    keyData: {
      type: string;
      participant: { nit: string; spbvi: string };
      payment_method: { type: string; number: string };
      person: {
        type: string;
        identification: { type: string; number: string };
        name: {
          first_name: string;
          second_name?: string;
          last_name: string;
          second_last_name?: string;
        };
      };
    }
  ): unknown {
    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    return this.buildStub(
      '/v1/key/resolve',
      'POST',
      {
        execution_id: executionId,
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        trace_id: traceId,
        key: {
          key: {
            type: keyData.type,
            value: keyValue
          },
          participant: keyData.participant,
          payment_method: keyData.payment_method,
          person: keyData.person
        },
        time_marks: {
          C110: new Date().toISOString(),
          C120: new Date().toISOString()
        }
      },
      200,
      keyValue ? [{ jsonpath: { selector: '$.key.value' }, equals: { body: keyValue } }] : undefined
    );
  }

  private createMolErrorStub(errorCode: string, description: string, scenario: string): unknown {
    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    return this.buildStub(
      '/v1/payment',
      'POST',
      {
        status: 'ERROR',
        errors: [{ code: errorCode, description }]
      },
      200,
      [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: scenario } }]
    );
  }

  private createMolGenericErrorStub(errorCode: string, description: string, scenario: string): unknown {
    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    return this.buildStub(
      '/v1/payment',
      'POST',
      {
        status: 'ERROR',
        error: { code: errorCode, description, id: `error-id-${errorCode}` }
      },
      200,
      [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: scenario } }]
    );
  }

  private createMolSuccessStub(status: string, endToEndId: string, executionId: string, scenario?: string): unknown {
    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    return this.buildStub(
      '/v1/payment',
      'POST',
      {
        end_to_end_id: endToEndId,
        execution_id: executionId,
        status
      },
      200,
      scenario ? [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: scenario } }] : undefined
    );
  }

  private async createImposter(stubs: unknown[], port: number, serviceName: string): Promise<void> {
    if (!this.manager) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Creando ${serviceName} imposter con ${stubs.length} stubs...`);
    try {
      await this.withTimeout(
        this.manager.createImposter(stubs, port.toString()),
        15000,
        `${serviceName} imposter creation on port ${port}`
      );
      this.logger.log(`   ${serviceName} imposter configurado en puerto ${port} con ${stubs.length} escenarios`);
    } catch (error) {
      this.logger.error(`Error configurando ${serviceName} imposter en puerto ${port}:`, error);
      throw error;
    }
  }

  private async setupDifeImposter(): Promise<void> {
    if (!this.buildStub || !this.manager || this.difePort === undefined) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Configurando DIFE imposter en puerto ${this.difePort}...`);

    const difeStubs: unknown[] = [];

    difeStubs.push(
      this.createDifeErrorStub(
        'DIFE-5005',
        'The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.',
        'invalid_key_5005'
      )
    );

    difeStubs.push(this.createDifeErrorStub('DIFE-4000', 'Invalid key format', '@INVALIDKEY'));

    difeStubs.push(this.createDifeErrorStub('DIFE-0004', 'The key does not exist or is canceled.', 'key_not_found'));

    difeStubs.push(this.createDifeErrorStub('DIFE-0005', 'The key is suspended by the client.', 'key_suspended'));

    difeStubs.push(
      this.createDifeErrorStub('DIFE-0006', 'The key is suspended by the participant.', 'key_suspended_participant')
    );

    difeStubs.push(this.createDifeErrorStub('DIFE-5000', 'Timeout.', 'dife_timeout'));

    difeStubs.push(
      this.createDifeErrorStub(
        'DIFE-0001',
        'The key is already registered with the same financial institution, but with a different account.',
        'dife_0001'
      )
    );

    difeStubs.push(
      this.createDifeErrorStub('DIFE-0002', 'The key is already registered with the same account.', 'dife_0002')
    );

    difeStubs.push(
      this.createDifeErrorStub(
        'DIFE-0003',
        'The key is already registered with another financial institution.',
        'dife_0003'
      )
    );

    difeStubs.push(
      this.createDifeErrorStub('DIFE-0007', 'There are not enough privileges to perform this operation.', 'dife_0007')
    );

    difeStubs.push(this.createDifeErrorStub('DIFE-0008', 'An unexpected error occurred in the DICE API', 'dife_0008'));

    difeStubs.push(
      this.createDifeErrorStub(
        'DIFE-5001',
        'Another request is already processing this payload (duplication).',
        'dife_5001'
      )
    );

    difeStubs.push(this.createDifeErrorStub('DIFE-5003', 'The participant does not exist.', 'dife_5003'));

    difeStubs.push(this.createDifeErrorStub('DIFE-9999', 'An unexpected error occurred.', 'dife_9999'));

    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          error: 'Internal server error'
        },
        500,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: 'server_error' } }]
      )
    );

    difeStubs.push(
      this.createDifeSuccessStub(
        '@TIMEOUT',
        'c090c73be331b56150e6c1f012a81387d0234ab44760549de678be19f9f2514a',
        'dife-trace-id-timeout',
        {
          type: 'O',
          participant: { nit: '12345678', spbvi: 'CRB' },
          payment_method: { type: 'CAHO', number: '123456337031' },
          person: {
            type: 'N',
            identification: { type: 'CC', number: '17184719' },
            name: {
              first_name: 'Pablo',
              second_name: 'Javier',
              last_name: 'Benitez',
              second_last_name: 'Morales'
            }
          }
        }
      )
    );

    difeStubs.push(
      this.createDifeSuccessStub('@COLOMBIA', 'dife-execution-id-mock', 'dife-trace-id-mock', {
        type: 'O',
        participant: { nit: '12345678', spbvi: 'CRB' },
        payment_method: { type: 'CAHO', number: '1234567890123' },
        person: {
          type: 'N',
          identification: { type: 'CC', number: '123143455' },
          name: {
            first_name: 'Juan',
            second_name: 'Carlos',
            last_name: 'Pérez',
            second_last_name: 'Gómez'
          }
        }
      })
    );

    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          execution_id: 'dife-execution-id-default',
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS',
          trace_id: 'dife-trace-id-default',
          key: {
            key: {
              type: 'O',
              value: 'default-key'
            },
            participant: { nit: '12345678', spbvi: 'CRB' },
            payment_method: { type: 'CAHO', number: '1234567890123' },
            person: {
              type: 'N',
              identification: { type: 'CC', number: '123143455' },
              name: {
                first_name: 'Juan',
                second_name: 'Carlos',
                last_name: 'Pérez',
                second_last_name: 'Gómez'
              }
            }
          },
          time_marks: {
            C110: new Date().toISOString(),
            C120: new Date().toISOString()
          }
        },
        200
      )
    );

    await this.createImposter(difeStubs, this.difePort, 'DIFE');
  }

  private async setupMolImposter(): Promise<void> {
    if (!this.buildStub || !this.manager || this.molPort === undefined) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Configurando MOL imposter en puerto ${this.molPort}...`);

    const paymentStubs: unknown[] = [];

    paymentStubs.push(this.createMolErrorStub('MOL-4017', 'Time-out declared by MOL', 'timeout_4017'));

    paymentStubs.push(this.createMolErrorStub('MOL-4019', 'Timeout with the account owner bank', 'timeout_4019'));

    paymentStubs.push(
      this.createMolErrorStub(
        'MOL-5005',
        'The field creditor.key.type has an invalid format. Must be one of IDENTIFICATION, PHONE, MAIL, ALPHANUMERIC, MERCHANT_CODE, but received MECHANT_CODE',
        'mol_5005'
      )
    );

    paymentStubs.push(this.createMolErrorStub('MOL-4003', 'Inbound bank classifier not found', 'mol_4003'));

    paymentStubs.push(
      this.createMolErrorStub(
        'MOL-4006',
        'Error in the validations of the account of the Financial Consumer Recipient',
        'mol_4006'
      )
    );

    paymentStubs.push(
      this.createMolErrorStub('MOL-4007', 'Invalid account number of the Receiving Client', 'mol_4007')
    );

    paymentStubs.push(
      this.createMolErrorStub('MOL-4008', 'Incorrect identification of the Receiving Client', 'mol_4008')
    );

    paymentStubs.push(
      this.createMolErrorStub('MOL-4009', 'Payment method type of the Receiving Client is incorrect', 'mol_4009')
    );

    paymentStubs.push(this.createMolErrorStub('MOL-4010', 'Receiving Client account does not exist', 'mol_4010'));

    paymentStubs.push(this.createMolErrorStub('MOL-4011', 'Risk control due to suspicion of fraud', 'mol_4011'));

    paymentStubs.push(
      this.createMolErrorStub('MOL-4012', 'Exceeds the maximum amount for low-value deposits', 'mol_4012')
    );

    paymentStubs.push(
      this.createMolErrorStub('MOL-4013', 'Exceeds the maximum amount of the payment network', 'mol_4013')
    );

    paymentStubs.push(
      this.createMolErrorStub('MOL-4014', 'Exceeds the maximum amount of the Receiving Participant', 'mol_4014')
    );

    paymentStubs.push(this.createMolGenericErrorStub('400', 'Validation failed', 'validation_error'));

    paymentStubs.push(this.createMolGenericErrorStub('403', 'The participant id is inactive.', 'rejected'));

    paymentStubs.push(
      this.createMolSuccessStub('PENDING', 'mol-end-to-end-id-processing', 'mol-execution-id-processing', 'processing')
    );

    if (!this.buildStub) {
      throw new Error('Mountebank no está disponible');
    }
    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          error: 'Internal server error'
        },
        500,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'server_error' } }]
      )
    );

    paymentStubs.push(
      this.createMolSuccessStub(
        'PROCESSING',
        '20251209830513238CRB001765342459806',
        '202512090BANKCRB000e396bbdd82',
        'timeout_pending'
      )
    );

    paymentStubs.push(this.createMolSuccessStub('PROCESSING', 'mol-end-to-end-id-mock', 'mol-execution-id-mock'));

    const queryStubs: unknown[] = [];

    queryStubs.push(
      this.buildStub(
        '/v1/payments',
        'GET',
        {
          items: [],
          pagination: {
            currentPage: 1,
            pageSize: 10,
            totalResults: 0
          },
          trace_id: 'query-trace-id-not-found',
          errors: []
        },
        200,
        [{ equals: { query: { end_to_end_id: '20251209830513238CRB001765342459806' } } }]
      )
    );

    queryStubs.push(
      this.buildStub(
        '/v1/payments',
        'GET',
        {
          items: [
            {
              end_to_end_id: 'mol-end-to-end-id-mock',
              internal_id: 'internal-id-mock',
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
          trace_id: 'query-trace-id-mock',
          errors: []
        },
        200
      )
    );

    this.logger.log(
      `   Creando MOL imposter con ${paymentStubs.length} payment stubs y ${queryStubs.length} query stubs...`
    );
    await this.createImposter([...paymentStubs, ...queryStubs], this.molPort, 'MOL');
  }
}
