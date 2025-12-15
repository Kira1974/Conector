"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionMapper = void 0;
class KeyResolutionMapper {
    static toDto(model) {
        return {
            correlation_id: model.correlationId,
            key: {
                type: model.keyType || 'O',
                value: model.key
            },
            time_marks: {
                C110: new Date().toISOString(),
                C120: new Date().toISOString()
            }
        };
    }
    static toDomain(dto) {
        const hasValidKey = dto.key?.key &&
            dto.key.participant &&
            dto.key.payment_method &&
            dto.key.person?.identification &&
            dto.key.person.name;
        return {
            correlationId: dto.correlation_id,
            executionId: dto.execution_id,
            traceId: dto.trace_id,
            resolvedKey: hasValidKey
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
exports.KeyResolutionMapper = KeyResolutionMapper;
//# sourceMappingURL=key-resolution.mapper.js.map