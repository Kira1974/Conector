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

  private async setupDifeImposter(): Promise<void> {
    if (!this.buildStub || !this.manager || this.difePort === undefined) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Configurando DIFE imposter en puerto ${this.difePort}...`);

    const difeStubs: unknown[] = [];

    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
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
        },
        200,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: 'invalid_key_5005' } }]
      )
    );

    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [{ code: 'DIFE-4000', description: 'Invalid key format' }]
        },
        200,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: '@INVALIDKEY' } }]
      )
    );

    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [{ code: 'DIFE-0004', description: 'The key does not exist or is canceled.' }]
        },
        200,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: 'key_not_found' } }]
      )
    );

    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          correlation_id: 'test-correlation-id',
          execution_id: 'dife-execution-id-error',
          status: 'ERROR',
          trace_id: 'dife-trace-id-error',
          errors: [{ code: 'DIFE-0005', description: 'The key is suspended by the client.' }]
        },
        200,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: 'key_suspended' } }]
      )
    );

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
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          execution_id: 'c090c73be331b56150e6c1f012a81387d0234ab44760549de678be19f9f2514a',
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS',
          trace_id: 'dife-trace-id-timeout',
          key: {
            key: {
              type: 'O',
              value: '@TIMEOUT'
            },
            participant: {
              nit: '12345678',
              spbvi: 'CRB'
            },
            payment_method: {
              type: 'CAHO',
              number: '123456337031'
            },
            person: {
              type: 'N',
              identification: {
                type: 'CC',
                number: '17184719'
              },
              name: {
                first_name: 'Pablo',
                second_name: 'Javier',
                last_name: 'Benitez',
                second_last_name: 'Morales'
              }
            }
          },
          time_marks: {
            C110: new Date().toISOString(),
            C120: new Date().toISOString()
          }
        },
        200,
        [{ jsonpath: { selector: '$.key.value' }, equals: { body: '@TIMEOUT' } }]
      )
    );

    difeStubs.push(
      this.buildStub(
        '/v1/key/resolve',
        'POST',
        {
          execution_id: 'dife-execution-id-mock',
          correlation_id: 'test-correlation-id',
          status: 'SUCCESS',
          trace_id: 'dife-trace-id-mock',
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
            C110: new Date().toISOString(),
            C120: new Date().toISOString()
          }
        },
        200
      )
    );

    this.logger.log(`   Creando DIFE imposter con ${difeStubs.length} stubs...`);
    try {
      await this.withTimeout(
        this.manager.createImposter(difeStubs, this.difePort.toString()),
        15000,
        `DIFE imposter creation on port ${this.difePort}`
      );
      this.logger.log(`   DIFE imposter configurado en puerto ${this.difePort} con ${difeStubs.length} escenarios`);
    } catch (error) {
      this.logger.error(`Error configurando DIFE imposter en puerto ${this.difePort}:`, error);
      throw error;
    }
  }

  private async setupMolImposter(): Promise<void> {
    if (!this.buildStub || !this.manager || this.molPort === undefined) {
      throw new Error('Mountebank no está disponible');
    }
    this.logger.log(`   Configurando MOL imposter en puerto ${this.molPort}...`);

    const paymentStubs: unknown[] = [];

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4017', description: 'Time-out declared by MOL' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'timeout_4017' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4019', description: 'Timeout with the account owner bank' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'timeout_4019' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [
            {
              code: 'MOL-5005',
              description:
                'The field creditor.key.type has an invalid format. Must be one of IDENTIFICATION, PHONE, MAIL, ALPHANUMERIC, MERCHANT_CODE, but received MECHANT_CODE'
            }
          ]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_5005' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4003', description: 'Inbound bank classifier not found' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4003' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4007', description: 'Invalid account number of the Receiving Client' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4007' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4008', description: 'Incorrect identification of the Receiving Client' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4008' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4009', description: 'Payment method type of the Receiving Client is incorrect' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4009' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4010', description: 'Receiving Client account does not exist' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4010' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4011', description: 'Risk control due to suspicion of fraud' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4011' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4012', description: 'Exceeds the maximum amount for low-value deposits' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4012' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4013', description: 'Exceeds the maximum amount of the payment network' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4013' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          errors: [{ code: 'MOL-4014', description: 'Exceeds the maximum amount of the Receiving Participant' }]
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'mol_4014' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          error: { code: '400', description: 'Validation failed', id: 'error-id-400' }
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'validation_error' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          status: 'ERROR',
          error: { code: '403', description: 'The participant id is inactive.', id: 'error-id-403' }
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'rejected' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          end_to_end_id: 'mol-end-to-end-id-processing',
          execution_id: 'mol-execution-id-processing',
          status: 'PENDING'
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'processing' } }]
      )
    );

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
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          end_to_end_id: '20251209830513238CRB001765342459806',
          execution_id: '202512090BANKCRB000e396bbdd82',
          status: 'PROCESSING'
        },
        200,
        [{ jsonpath: { selector: '$.additional_informations' }, equals: { body: 'timeout_pending' } }]
      )
    );

    paymentStubs.push(
      this.buildStub(
        '/v1/payment',
        'POST',
        {
          end_to_end_id: 'mol-end-to-end-id-mock',
          execution_id: 'mol-execution-id-mock',
          status: 'PROCESSING'
        },
        200
      )
    );

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
    try {
      await this.withTimeout(
        this.manager.createImposter([...paymentStubs, ...queryStubs], this.molPort.toString()),
        15000,
        `MOL imposter creation on port ${this.molPort}`
      );
      this.logger.log(`   MOL imposter configurado en puerto ${this.molPort} con ${paymentStubs.length} escenarios`);
    } catch (error) {
      this.logger.error(`Error configurando MOL imposter en puerto ${this.molPort}:`, error);
      throw error;
    }
  }
}
