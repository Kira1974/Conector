"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiAccountQueryDocs = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const account_query_examples_1 = require("../examples/account-query.examples");
const schemas_1 = require("../schemas");
function ApiAccountQueryDocs() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: 'Query account information by Bre-B key',
        description: 'Resolves a Bre-B key (mobile, email, alphanumeric, etc.) and returns associated account information'
    }), (0, swagger_1.ApiBody)({
        type: schemas_1.AccountQueryRequestSchema,
        description: 'Account query request'
    }), (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'Account query successful',
        type: schemas_1.AccountQuerySuccessResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.SUCCESS_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Validation failed - Invalid key format',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.VALIDATION_FAILED_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Not Found - Key does not exist or is canceled',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.NOT_FOUND_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 422,
        description: 'Rejected by provider - Business validation error',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal server error',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 502,
        description: 'Provider error - External system error',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.PROVIDER_ERROR_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 504,
        description: 'Gateway Timeout - DIFE response timeout',
        type: schemas_1.AccountQueryErrorResponseSchema,
        examples: account_query_examples_1.AccountQueryExamples.GATEWAY_TIMEOUT_RESPONSES
    }));
}
exports.ApiAccountQueryDocs = ApiAccountQueryDocs;
//# sourceMappingURL=api-account-query-docs.decorator.js.map