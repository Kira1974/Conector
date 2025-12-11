interface MounteBankManager {
  startMountebank(): Promise<void>;
  createImposter(stubs: unknown[], servicePort: string): Promise<unknown>;
  stopMountebank(): Promise<void>;
}

type BuildStubFunction = (
  path: string,
  method: string,
  responseBody: unknown,
  statusCode: number,
  predicates?: unknown[]
) => unknown;

interface MockConfig {
  oauthPort: number;
  difePort: number;
  molPort: number;
}

class MountebankMockSetup {
  private manager: MounteBankManager;
  private buildStub: BuildStubFunction;
  private config: MockConfig;

  constructor(config: MockConfig) {
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

  async setup(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('Starting Mountebank...');
    await this.manager.startMountebank();

    // eslint-disable-next-line no-console
    console.log('Setting up OAuth mock...');
    await this.setupOAuth();

    // eslint-disable-next-line no-console
    console.log('Setting up DIFE mock...');
    await this.setupDife();

    // eslint-disable-next-line no-console
    console.log('Setting up MOL mock...');
    await this.setupMol();

    // eslint-disable-next-line no-console
    console.log('Mountebank mocks configured successfully!');
    // eslint-disable-next-line no-console
    console.log(`OAuth: http://localhost:${this.config.oauthPort}`);
    // eslint-disable-next-line no-console
    console.log(`DIFE: http://localhost:${this.config.difePort}`);
    // eslint-disable-next-line no-console
    console.log(`MOL: http://localhost:${this.config.molPort}`);
  }

  private async setupOAuth(): Promise<void> {
    const stub = this.buildStub(
      '/token',
      'POST',
      {
        access_token: 'mock-oauth-token-for-testing',
        token_type: 'Bearer',
        expires_in: 3600
      },
      200,
      [{ equals: { query: { grant_type: 'client_credentials' } } }]
    );

    await this.manager.createImposter([stub], this.config.oauthPort.toString());
  }

  private async setupDife(): Promise<void> {
    const successStub = this.buildStub(
      '/v1/key/resolve',
      'POST',
      {
        execution_id: 'dife-execution-id-mock',
        correlation_id: 'mock-correlation-id',
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
    );

    await this.manager.createImposter([successStub], this.config.difePort.toString());
  }

  private async setupMol(): Promise<void> {
    const paymentStub = this.buildStub(
      '/v1/payment',
      'POST',
      {
        end_to_end_id: 'mol-end-to-end-id-mock',
        execution_id: 'mol-execution-id-mock',
        status: 'PROCESSING'
      },
      200
    );

    const queryStub = this.buildStub(
      '/v1/payments',
      'GET',
      {
        items: [],
        pagination: {
          currentPage: 1,
          pageSize: 10,
          totalResults: 0
        },
        trace_id: 'query-trace-id-mock',
        errors: []
      },
      200
    );

    await this.manager.createImposter([paymentStub, queryStub], this.config.molPort.toString());
  }

  async stop(): Promise<void> {
    await this.manager.stopMountebank();
  }
}

const config: MockConfig = {
  oauthPort: parseInt(process.env.MOUNTEBANK_OAUTH_PORT || '4545', 10),
  difePort: parseInt(process.env.MOUNTEBANK_DIFE_PORT || '4546', 10),
  molPort: parseInt(process.env.MOUNTEBANK_MOL_PORT || '4547', 10)
};

const setup = new MountebankMockSetup(config);

setup
  .setup()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Mountebank mocks are ready for testing environment');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting up Mountebank mocks:', error);
    process.exit(1);
  });

process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  console.log('\nShutting down Mountebank...');
  void setup.stop().then(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  console.log('\nShutting down Mountebank...');
  void setup.stop().then(() => {
    process.exit(0);
  });
});
