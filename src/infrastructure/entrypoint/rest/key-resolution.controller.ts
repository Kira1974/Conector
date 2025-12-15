import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { KeyResolutionUseCase } from '@core/usecase';

import { KeyResolutionResponseDto } from '../dto';

@ApiTags('Key Resolution')
@Controller('keys')
export class KeyResolutionController {
  constructor(private readonly keyResolutionUseCase: KeyResolutionUseCase) {}
  @Get(':key')
  @HttpCode(HttpStatus.OK)
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
            'The key.value has an invalid format. Must be an email, can have a minimum of 3 and a maximum of 92 characters and a valid structure.'
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
    return this.keyResolutionUseCase.execute(key);
  }
}
