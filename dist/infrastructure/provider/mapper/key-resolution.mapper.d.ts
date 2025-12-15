import { KeyResolutionRequest, KeyResolutionResponse } from '@core/model';
import { ResolveKeyRequestDto, ResolveKeyResponseDto } from '../http-clients/dto';
export declare class KeyResolutionMapper {
    static toDto(model: KeyResolutionRequest): ResolveKeyRequestDto;
    static toDomain(dto: ResolveKeyResponseDto): KeyResolutionResponse;
}
