import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AccountQueryRequestDto } from '../../dto';
import { AccountQueryExamples } from '../examples/account-query.examples';

export function ApiAccountQueryDocs(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary: 'Query account information',
      description: 'Retrieves account and holder information associated with a BREB key.'
    }),
    ApiBody({
      description: 'Account query request with BREB type and key value',
      type: AccountQueryRequestDto,
      examples: {
        brebQuery: {
          summary: 'BREB account query',
          value: {
            account: {
              type: 'BREB',
              value: '1231123123123'
            }
          }
        }
      }
    }),
    ApiResponse({
      status: 201,
      description: 'SUCCESSFUL - Account information retrieved successfully',
      examples: AccountQueryExamples.SUCCESS_RESPONSES
    }),
    ApiResponse({
      status: 400,
      description: 'VALIDATION_FAILED - Adapter validations failed (incomplete request, invalid key format)',
      examples: AccountQueryExamples.VALIDATION_FAILED_RESPONSES
    }),
    ApiResponse({
      status: 422,
      description:
        'REJECTED_BY_PROVIDER - DIFE errors/exceptions (key not found, suspended, business rules violations)',
      examples: AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES
    }),
    ApiResponse({
      status: 502,
      description: 'PROVIDER_ERROR - External service errors (timeout, external errors)',
      examples: AccountQueryExamples.PROVIDER_ERROR_RESPONSES
    }),
    ApiResponse({
      status: 500,
      description: 'ERROR - Adapter service errors',
      examples: AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES
    })
  );
}
