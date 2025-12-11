import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { AppModule } from '../../src/configuration/app.module';
import { AuthService } from '../../src/infrastructure/provider/http-clients/auth.service';

import { MountebankHelper, MountebankConfig } from './mountebank-helper';

describe('Transfer E2E Tests with Mountebank', () => {
  let app: INestApplication;
  let mountebankHelper: MountebankHelper;
  const mountebankConfig: MountebankConfig = {
    oauthPort: 4545,
    difePort: 4546,
    molPort: 4547
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    mountebankHelper = new MountebankHelper(mountebankConfig);
    await mountebankHelper.start();

    process.env.CLIENT_ID_CREDIBANCO = 'test-client-id';
    process.env.CLIENT_SECRET_CREDIBANCO = 'test-client-secret';
    process.env.MTLS_CLIENT_CERT_CREDIBANCO = 'test-cert';
    process.env.MTLS_CLIENT_KEY_CREDIBANCO = 'test-key';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await mountebankHelper.stop();
  });

  beforeEach(async () => {
    await mountebankHelper.clearImposters();

    const authService = app.get(AuthService);
    authService.clearCache();
  });

  describe('Successful Transfer Flow', () => {
    it('should complete a transfer successfully', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('success');
      await mountebankHelper.setupMolPaymentImposter('success');

      const transferRequest = {
        transactionId: 'test-transaction-123',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const endToEndId = 'mol-end-to-end-id-123';
      const executionId = 'mol-execution-id-123';

      const transferPromise = request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const webhookRequest = {
        id: 'webhook-id-123',
        source: 'MOL',
        status: 'SUCCESS',
        payload: {
          event_name: 'payment.settlement',
          event_type: 'settlement',
          payload: {
            execution_id: executionId,
            end_to_end_id: endToEndId,
            status: 'SUCCESS'
          },
          properties: {
            event_date: new Date().toISOString(),
            trace_id: 'trace-id-123'
          }
        }
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/api/v1/transfer-confirmation')
        .send(webhookRequest);

      expect(webhookResponse.status).toBe(200);

      const response = await transferPromise;

      expect(response.status).toBe(200);
      expect(response.body.responseCode).toBe('PENDING');
      expect(response.body.externalTransactionId).toBeDefined();
      expect(response.body.additionalData).toBeDefined();
      expect(response.body.additionalData.END_TO_END).toBeDefined();
    }, 60000);
  });

  describe('DIFE Error Scenarios', () => {
    it('should handle invalid key format error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('invalid_key');

      const transferRequest = {
        transactionId: 'test-transaction-invalid-key',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@INVALIDKEY'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBe(422);
      expect(response.body.networkCode).toBeDefined();
      expect(response.body.responseCode).toBe('REJECTED_BY_PROVIDER');
    });

    it('should handle key not found error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('key_not_found');

      const transferRequest = {
        transactionId: 'test-transaction-key-not-found',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@NOTFOUND'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBe(422);
      expect(response.body.networkCode).toBeDefined();
      expect(response.body.responseCode).toBe('REJECTED_BY_PROVIDER');
    });

    it('should handle key suspended error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('key_suspended');

      const transferRequest = {
        transactionId: 'test-transaction-key-suspended',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@SUSPENDED'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBe(422);
      expect(response.body.networkCode).toBeDefined();
      expect(response.body.responseCode).toBe('REJECTED_BY_PROVIDER');
    });

    it('should handle DIFE server error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('server_error');

      const transferRequest = {
        transactionId: 'test-transaction-dife-error',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('MOL Payment Error Scenarios', () => {
    it('should handle MOL validation error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('success');
      await mountebankHelper.setupMolPaymentImposter('validation_error');

      const transferRequest = {
        transactionId: 'test-transaction-mol-validation',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBe(422);
      expect(response.body.networkCode).toBeDefined();
      expect(response.body.responseCode).toBe('REJECTED_BY_PROVIDER');
    });

    it('should handle MOL payment rejected error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('success');
      await mountebankHelper.setupMolPaymentImposter('rejected');

      const transferRequest = {
        transactionId: 'test-transaction-mol-rejected',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBe(422);
      expect(response.body.networkCode).toBeDefined();
      expect(response.body.responseCode).toBe('REJECTED_BY_PROVIDER');
    });

    it('should handle MOL server error', async () => {
      await mountebankHelper.setupOAuthImposter('success');
      await mountebankHelper.setupDifeImposter('success');
      await mountebankHelper.setupMolPaymentImposter('server_error');

      const transferRequest = {
        transactionId: 'test-transaction-mol-error',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('OAuth Error Scenarios', () => {
    it('should handle invalid credentials error', async () => {
      await mountebankHelper.setupOAuthImposter('invalid_credentials');

      const transferRequest = {
        transactionId: 'test-transaction-oauth-error',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should handle OAuth server error', async () => {
      await mountebankHelper.setupOAuthImposter('server_error');

      const transferRequest = {
        transactionId: 'test-transaction-oauth-server-error',
        transaction: {
          amount: {
            value: 100.0,
            currency: 'COP'
          },
          description: 'Test transfer'
        },
        transactionParties: {
          payee: {
            accountInfo: {
              value: '@COLOMBIA'
            }
          }
        },
        additionalData: {}
      };

      const response = await request(app.getHttpServer()).post('/api/v1/transfer').send(transferRequest);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });
});
