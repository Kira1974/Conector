import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AccountQueryExamples } from '../examples/account-query.examples';
import {
  AccountQueryRequestSchema,
  AccountQuerySuccessResponseSchema,
  AccountQueryErrorResponseSchema
} from '../schemas';

export function ApiAccountQueryDocs(): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiOperation({
      summary: 'Query account information by Bre-B key',
      description: 'Resolves a Bre-B key (mobile, email, alphanumeric, etc.) and returns associated account information'
    }),
    ApiBody({
      type: AccountQueryRequestSchema,
      description: 'Account query request'
    }),
    ApiResponse({
      status: 201,
      description: 'Account query successful',
      type: AccountQuerySuccessResponseSchema,
      examples: AccountQueryExamples.SUCCESS_RESPONSES
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed - Invalid key format',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.VALIDATION_FAILED_RESPONSES
    }),
    ApiResponse({
      status: 404,
      description: 'Not Found - Key does not exist or is canceled',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.NOT_FOUND_RESPONSES
    }),
    ApiResponse({
      status: 422,
      description: 'Rejected by provider - Business validation error',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES
    }),
    ApiResponse({
      status: 500,
      description: 'Internal server error',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES
    }),
    ApiResponse({
      status: 502,
      description: 'Provider error - External system error',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.PROVIDER_ERROR_RESPONSES
    }),
    ApiResponse({
      status: 504,
      description: 'Gateway Timeout - DIFE response timeout',
      type: AccountQueryErrorResponseSchema,
      examples: AccountQueryExamples.GATEWAY_TIMEOUT_RESPONSES
    })
  );
}
