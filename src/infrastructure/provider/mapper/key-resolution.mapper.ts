import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { KeyTypeDife } from '@core/constant';

import { ResolveKeyRequestDto, ResolveKeyResponseDto } from '../http-clients/dto';

/**
 * Mapper for Key Resolution between domain models and provider DTOs
 */
export class KeyResolutionMapper {
  /**
   * Convert domain model to provider DTO
   */
  static toDto(model: KeyResolutionRequest): ResolveKeyRequestDto {
    return {
      correlation_id: model.correlationId,
      key: {
        type: (model.keyType as KeyTypeDife) || ('O' as KeyTypeDife),
        value: model.key
      },
      time_marks: {
        C110: new Date().toISOString(),
        C120: new Date().toISOString()
      }
    };
  }

  /**
   * Convert provider DTO to domain model
   */
  static toDomain(dto: ResolveKeyResponseDto): KeyResolutionResponse {
    return {
      correlationId: dto.correlation_id,
      executionId: dto.execution_id,
      traceId: dto.trace_id,
      resolvedKey: dto.key
        ? {
            keyType: dto.key.key.type,
            keyValue: dto.key.key.value,
            participant: {
              nit: dto.key.participant.nit,
              spbvi: dto.key.participant.spbvi
            },
            paymentMethod: {
              number: dto.key.payment_method.number,
              type: dto.key.payment_method.type
            },
            person: {
              identificationNumber: dto.key.person.identification.number,
              identificationType: dto.key.person.identification.type,
              legalCompanyName: dto.key.person.legal_name || '',
              firstName: dto.key.person.name.first_name,
              lastName: dto.key.person.name.last_name,
              secondName: dto.key.person.name.second_name,
              secondLastName: dto.key.person.name.second_last_name,
              personType: dto.key.person.type
            }
          }
        : undefined,
      status: dto.status,
      errors: dto.errors?.map((error) => `${error.code}: ${error.description}`) || []
    };
  }
}
