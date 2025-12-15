import { KeyResolutionMapper } from '@infrastructure/provider/mapper/key-resolution.mapper';
import { ResolveKeyResponseDto } from '@infrastructure/provider/http-clients/dto/resolve-key.dto';
import { KeyTypeDife, PaymentMethodTypeDife, IdentificationTypeDife, PersonTypeDife } from '@core/constant';

describe('KeyResolutionMapper', () => {
  describe('toDomain', () => {
    it('should return resolvedKey when all required properties exist', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        execution_id: 'test-execution-id',
        trace_id: 'test-trace-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: 'O' as KeyTypeDife,
            value: '3001234567'
          },
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'John',
              second_name: 'Carlos',
              last_name: 'Doe',
              second_last_name: 'Smith'
            }
          }
        }
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeDefined();
      expect(result.resolvedKey?.keyType).toBe('O');
      expect(result.resolvedKey?.keyValue).toBe('3001234567');
      expect(result.resolvedKey?.person.identificationNumber).toBe('1234567890');
    });

    it('should return undefined resolvedKey when key is missing', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS'
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeUndefined();
    });

    it('should return undefined resolvedKey when key.key is missing', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        key: {
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'John',
              second_name: 'Carlos',
              last_name: 'Doe',
              second_last_name: 'Smith'
            }
          }
        } as any
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeUndefined();
    });

    it('should return undefined resolvedKey when participant is missing', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: 'O' as KeyTypeDife,
            value: '3001234567'
          },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            },
            name: {
              first_name: 'John',
              second_name: 'Carlos',
              last_name: 'Doe',
              second_last_name: 'Smith'
            }
          }
        } as any
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeUndefined();
    });

    it('should return undefined resolvedKey when person.identification is missing', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: 'O' as KeyTypeDife,
            value: '3001234567'
          },
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            name: {
              first_name: 'John',
              second_name: 'Carlos',
              last_name: 'Doe',
              second_last_name: 'Smith'
            }
          } as any
        }
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeUndefined();
    });

    it('should return undefined resolvedKey when person.name is missing', () => {
      const dto: ResolveKeyResponseDto = {
        correlation_id: 'test-correlation-id',
        status: 'SUCCESS',
        key: {
          key: {
            type: 'O' as KeyTypeDife,
            value: '3001234567'
          },
          participant: {
            nit: '12345678',
            spbvi: 'CRB'
          },
          payment_method: {
            type: 'CAHO' as PaymentMethodTypeDife,
            number: '1234567890'
          },
          person: {
            type: 'N' as PersonTypeDife,
            identification: {
              type: 'CC' as IdentificationTypeDife,
              number: '1234567890'
            }
          } as any
        }
      };

      const result = KeyResolutionMapper.toDomain(dto);

      expect(result.resolvedKey).toBeUndefined();
    });
  });
});
