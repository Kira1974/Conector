import { Controller, Get, Param, HttpCode, HttpStatus, HttpException, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThTraceEvent,
  ThEventTypeBuilder,
  ThHttpRequestTracingInterceptor,
  ThHttpResponseTracingInterceptor
} from 'themis';

import { KeyResolutionUseCase } from '@core/usecase';
import { calculateKeyType, obfuscateKey } from '@core/util';

import { KeyResolutionResponseDto } from '../dto';
import { KeyResolutionParamsDto } from '../dto/key-resolution-params.dto';

import { ApiKeyResolutionDocs } from './decorators/api-key-resolution-docs.decorator';
import { KeyResolutionHttpStatusMapper } from './mappers/key-resolution-http-status.mapper';

@ApiTags('Key Resolution')
@Controller('keys')
@UseInterceptors(ThHttpRequestTracingInterceptor, ThHttpResponseTracingInterceptor)
export class KeyResolutionController {
  private readonly logger: ThLogger;

  constructor(
    private readonly keyResolutionUseCase: KeyResolutionUseCase,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(KeyResolutionController.name, ThLoggerComponent.CONTROLLER);
  }

  @Get(':key')
  @HttpCode(HttpStatus.OK)
  @ApiKeyResolutionDocs()
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('key-resolution').setAction('get'),
    tags: ['key-resolution', 'dife']
  })
  async getKeyInformation(@Param() params: KeyResolutionParamsDto): Promise<KeyResolutionResponseDto> {
    const { key } = params;
    this.logger.log('CHARON_REQUEST', {
      keyType: calculateKeyType(key),
      key: obfuscateKey(key, 3)
    });

    const result = await this.keyResolutionUseCase.execute(key);
    const { response, correlationId, difeExecutionId } = result;

    const httpStatus =
      response.responseCode === 'SUCCESS'
        ? HttpStatus.OK
        : KeyResolutionHttpStatusMapper.mapNetworkCodeToHttpStatus(response.networkCode);

    this.logger.log('CHARON_RESPONSE', {
      status: httpStatus,
      correlationId,
      externalTransactionId: difeExecutionId,
      responseBody: response
    });

    if (response.responseCode !== 'SUCCESS') {
      throw new HttpException(response, httpStatus);
    }

    return response;
  }
}
