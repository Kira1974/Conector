import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { KeyResolutionUseCase } from '@core/usecase';
import { generateCorrelationId, calculateKeyType } from '@core/util';

import { KeyResolutionResponseDto } from '../dto';

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
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('key-resolution').setAction('get'),
    tags: ['key-resolution', 'dife']
  })
  @ApiOperation({
    summary: 'Get key resolution',
    description: 'Retrieves account and holder information associated with a payment key.'
  })
  @ApiParam({
    name: 'key',
    description:
      'Formats: alphanumeric (@XXXXX), mobile number (30XXXXXXXX), email address, commerce code (00XXXXXXXX), or identification number (123456789)',
    example: '@COLOMBIA',
    type: String
  })
  @ApiResponse({
    status: 200,
    description: 'Key information retrieved successfully',
    type: KeyResolutionResponseDto,
    examples: {
      success: {
        summary: 'Successful key resolution',
        value: {
          documentNumber: '123143455',
          documentType: 'CC',
          personName: 'Jua*** Car*** Pér*** Góm***',
          personType: 'N',
          financialEntityNit: '12345678',
          accountType: 'CAHO',
          accountNumber: '*******890123',
          key: '3125656294',
          keyType: 'M',
          responseCode: 'SUCCESS'
        }
      },
      error: {
        summary: 'Failed key resolution',
        value: {
          key: 'invalid_key_5005',
          keyType: 'NRIC',
          responseCode: 'ERROR',
          message: 'custom message.',
          networkCode: 'DIFE-5005',
          networkMessage:
            'DIFE: The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.'
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid key format'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error'
  })
  async getKeyInformation(@Param('key') key: string): Promise<KeyResolutionResponseDto> {

    const obfuscatedKey = this.obfuscateKeyForLogs(key);

    this.logger.log('CHARON_KEY_RESOLUTION Request', {
      method: 'GET',
      key: obfuscatedKey,
      keyType: calculateKeyType(key)
    });

    const responseDto = await this.keyResolutionUseCase.execute(key);

    this.logger.log('CHARON_KEY_RESOLUTION Response', {
      status: HttpStatus.OK,
      responseCode: responseDto.responseCode,
      keyType: responseDto.keyType,
      key: obfuscatedKey
    });

    return responseDto;
  }

  private obfuscateKeyForLogs(key: string): string {
    if (!key || key.length <= 5) {
      return '***';
    }
    const prefix = key.slice(0, 5);
    return `${prefix}***`;
  }
}