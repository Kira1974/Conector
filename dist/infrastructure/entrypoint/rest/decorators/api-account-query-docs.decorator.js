"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiAccountQueryDocs = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dto_1 = require("../../dto");
const account_query_examples_1 = require("../examples/account-query.examples");
function ApiAccountQueryDocs() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: 'Query account information',
        description: 'Retrieves account and holder information associated with a BREB key.'
    }), (0, swagger_1.ApiBody)({
        description: 'Account query request with BREB type and key value',
        type: dto_1.AccountQueryRequestDto,
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
    }), (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'SUCCESSFUL - Account information retrieved successfully',
        examples: account_query_examples_1.AccountQueryExamples.SUCCESS_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'VALIDATION_FAILED - Adapter validations failed (incomplete request, invalid key format)',
        examples: account_query_examples_1.AccountQueryExamples.VALIDATION_FAILED_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 422,
        description: 'REJECTED_BY_PROVIDER - DIFE errors/exceptions (key not found, suspended, business rules violations)',
        examples: account_query_examples_1.AccountQueryExamples.REJECTED_BY_PROVIDER_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 502,
        description: 'PROVIDER_ERROR - External service errors (timeout, external errors)',
        examples: account_query_examples_1.AccountQueryExamples.PROVIDER_ERROR_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'ERROR - Adapter service errors',
        examples: account_query_examples_1.AccountQueryExamples.INTERNAL_SERVER_ERROR_RESPONSES
    }));
}
exports.ApiAccountQueryDocs = ApiAccountQueryDocs;
//# sourceMappingURL=api-account-query-docs.decorator.js.map