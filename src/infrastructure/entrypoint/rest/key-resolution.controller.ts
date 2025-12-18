import { Controller, Get, Param, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { KeyResolutionUseCase } from '@core/usecase';
import { calculateKeyType } from '@core/util';

import { KeyResolutionResponseDto } from '../dto';

import { ApiKeyResolutionDocs } from './decorators/api-key-resolution-docs.decorator';
import { KeyResolutionHttpStatusMapper } from './mappers/key-resolution-http-status.mapper';

@ApiTags('Key Resolution')
@Controller('keys')
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
  async getKeyInformation(@Param('key') key: string): Promise<KeyResolutionResponseDto> {
    this.logger.log('KEY_RESOLUTION Request', {
      method: 'GET',
      KeyType: calculateKeyType(key),
      requestParams: JSON.stringify({ key }, null, 2)
    });

    const response = await this.keyResolutionUseCase.execute(key);

    if (response.responseCode !== 'SUCCESS') {
      const httpStatus = KeyResolutionHttpStatusMapper.mapNetworkCodeToHttpStatus(response.networkCode);
      throw new HttpException(response, httpStatus);
    }

    this.logger.log('KEY_RESOLUTION Response', {
      status: 200,
      responseCode: response.responseCode,
      responseBody: JSON.stringify(response, null, 2)
    });

    return response;
  }
}
