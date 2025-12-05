import { Test, TestingModule } from '@nestjs/testing';
import { ThLoggerService } from 'themis';

import { AuthService, HttpClientService } from '../../../../../src/infrastructure/provider/http-clients';
import { ResilienceConfigService } from '../../../../../src/core/util';

describe('AuthService', () => {
  let service: AuthService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    setContext: jest.fn(),
    setLogLevel: jest.fn()
  };

  const mockLoggerService = {
    getLogger: jest.fn().mockReturnValue(mockLogger)
  };

  const mockHttpInstance = {
    post: jest.fn()
  };

  const mockResilienceConfig = {
    getOAuthTimeout: jest.fn().mockReturnValue(15000)
  };

  const testEnv = {
    CLIENT_ID_CREDIBANCO: 'test-client-id',
    CLIENT_SECRET_CREDIBANCO: 'test-client-secret',
    MTLS_CLIENT_CERT_CREDIBANCO: 'test-cert',
    MTLS_CLIENT_KEY_CREDIBANCO: 'test-key',
    OAUTH_BASE: 'https://auth1-test.opencco.com/oauth2'
  };

  beforeEach(async () => {
    Object.assign(process.env, testEnv);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: HttpClientService,
          useValue: { instance: mockHttpInstance }
        },
        {
          provide: ThLoggerService,
          useValue: mockLoggerService
        },
        {
          provide: ResilienceConfigService,
          useValue: mockResilienceConfig
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    service['cache'].flushAll();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Generation - First Time', () => {
    it('should obtain token successfully on first call', async () => {
      const mockToken = 'mock-access-token-12345';
      const mockResponse = {
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        }
      };

      mockHttpInstance.post.mockResolvedValue(mockResponse);

      const token = await service.getToken();

      expect(token).toBe(mockToken);
      expect(mockHttpInstance.post).toHaveBeenCalledTimes(1);
      expect(mockHttpInstance.post).toHaveBeenCalledWith(
        `${testEnv.OAUTH_BASE}/token?grant_type=client_credentials`,
        '{}',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      );
    });

    it('should create correct Basic Auth header', async () => {
      const mockToken = 'mock-access-token';
      mockHttpInstance.post.mockResolvedValue({
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        }
      });

      await service.getToken();

      const expectedBasicAuth = Buffer.from(
        `${testEnv.CLIENT_ID_CREDIBANCO}:${testEnv.CLIENT_SECRET_CREDIBANCO}`
      ).toString('base64');

      expect(mockHttpInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedBasicAuth}`
          })
        })
      );
    });

    it('should configure mTLS certificates correctly', async () => {
      const mockToken = 'mock-access-token';
      mockHttpInstance.post.mockResolvedValue({
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        }
      });

      await service.getToken();

      expect(mockHttpInstance.post).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
        httpsAgent: expect.objectContaining({
          options: expect.objectContaining({
            cert: testEnv.MTLS_CLIENT_CERT_CREDIBANCO,
            key: testEnv.MTLS_CLIENT_KEY_CREDIBANCO,
            keepAlive: true
          })
        }),
        timeout: 15000,
        headers: expect.any(Object)
      });
    });
  });

  describe('Token Caching', () => {
    it('should REUSE cached token on subsequent calls (no new API call)', async () => {
      const mockToken = 'cached-token-12345';
      mockHttpInstance.post.mockResolvedValue({
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 3600
        }
      });

      const token1 = await service.getToken();
      expect(mockHttpInstance.post).toHaveBeenCalledTimes(1);
      expect(token1).toBe(mockToken);

      const token2 = await service.getToken();
      expect(mockHttpInstance.post).toHaveBeenCalledTimes(1);
      expect(token2).toBe(mockToken);

      const token3 = await service.getToken();
      expect(mockHttpInstance.post).toHaveBeenCalledTimes(1);
      expect(token3).toBe(mockToken);

      expect(token1).toBe(token2);
      expect(token2).toBe(token3);
    });

    it('should cache token with correct TTL (expires_in - 60 seconds)', async () => {
      const mockToken = 'ttl-token-12345';
      const expiresIn = 3600;

      mockHttpInstance.post.mockResolvedValue({
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: expiresIn
        }
      });

      await service.getToken();

      const cachedToken = service['cache'].get('auth_token');
      expect(cachedToken).toBe(mockToken);

      const ttl = service['cache'].getTtl('auth_token');
      const now = Date.now();
      const expectedTtl = (expiresIn - 60) * 1000;

      expect(ttl).toBeGreaterThan(now + expectedTtl - 5000);
      expect(ttl).toBeLessThan(now + expectedTtl + 5000);
    });

    it('should use minimum TTL of 30 seconds when expires_in is too short', async () => {
      const mockToken = 'short-ttl-token';

      mockHttpInstance.post.mockResolvedValue({
        data: {
          access_token: mockToken,
          token_type: 'Bearer',
          expires_in: 50
        }
      });

      await service.getToken();

      const ttl = service['cache'].getTtl('auth_token');
      const now = Date.now();
      const expectedMinTtl = 30 * 1000;

      expect(ttl).toBeGreaterThan(now + expectedMinTtl - 5000);
      expect(ttl).toBeLessThan(now + expectedMinTtl + 5000);
    });
  });

  it('should request NEW token after cache expires', async () => {
    const firstToken = 'first-token';
    const secondToken = 'second-token';

    mockHttpInstance.post.mockResolvedValueOnce({
      data: {
        access_token: firstToken,
        token_type: 'Bearer',
        expires_in: 1
      }
    });

    const token1 = await service.getToken();
    expect(token1).toBe(firstToken);
    expect(mockHttpInstance.post).toHaveBeenCalledTimes(1);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    service['cache'].del('auth_token');

    mockHttpInstance.post.mockResolvedValue({
      data: {
        access_token: secondToken,
        token_type: 'Bearer',
        expires_in: 3600
      }
    });

    const token2 = await service.getToken();
    expect(token2).toBe(secondToken);
    expect(mockHttpInstance.post).toHaveBeenCalledTimes(2);

    expect(token1).not.toBe(token2);
  });
});
