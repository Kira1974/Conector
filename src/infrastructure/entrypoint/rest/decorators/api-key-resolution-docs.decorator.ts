import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

import { KeyResolutionResponseDto } from '../../dto';
import { KeyResolutionExamples } from '../examples/key-resolution.examples';

export function ApiKeyResolutionDocs(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary: 'Get key resolution',
      description: 'Retrieves account and holder information associated with a payment key.'
    }),
    ApiParam({
      name: 'key',
      description:
        'Formats: alphanumeric (@XXXXX), mobile number (30XXXXXXXX), email address, commerce code (00XXXXXXXX), or identification number (123456789)',
      example: '@COLOMBIA',
      type: String
    }),
    ApiResponse({
      status: 200,
      description: 'Key information retrieved successfully',
      type: KeyResolutionResponseDto,
      examples: KeyResolutionExamples.SUCCESS_RESPONSES
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Key does not exist or is canceled',
      examples: KeyResolutionExamples.NOT_FOUND_RESPONSES
    }),
    ApiResponse({
      status: 422,
      description: 'Unprocessable Entity - Key is suspended or has invalid format',
      examples: KeyResolutionExamples.UNPROCESSABLE_ENTITY_RESPONSES
    }),
    ApiResponse({
      status: 502,
      description: 'Bad Gateway - DIFE service error',
      examples: KeyResolutionExamples.BAD_GATEWAY_RESPONSES
    }),
    ApiResponse({
      status: 504,
      description: 'Gateway Timeout - DIFE response timeout',
      examples: KeyResolutionExamples.GATEWAY_TIMEOUT_RESPONSES
    }),
    ApiResponse({
      status: 500,
      description: 'Internal Server Error - Charon internal error',
      examples: KeyResolutionExamples.INTERNAL_SERVER_ERROR_RESPONSES
    })
  );
}
