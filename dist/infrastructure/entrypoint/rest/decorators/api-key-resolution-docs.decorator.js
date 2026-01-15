"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyResolutionDocs = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const dto_1 = require("../../dto");
const key_resolution_examples_1 = require("../examples/key-resolution.examples");
function ApiKeyResolutionDocs() {
    return (0, common_1.applyDecorators)((0, swagger_1.ApiOperation)({
        summary: 'Get key resolution',
        description: 'Retrieves account and holder information associated with a payment key.'
    }), (0, swagger_1.ApiParam)({
        name: 'key',
        description: 'Formats: alphanumeric (@XXXXX), mobile number (30XXXXXXXX), email address, commerce code (00XXXXXXXX), or identification number (123456789)',
        example: '@COLOMBIA',
        type: String
    }), (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Key information retrieved successfully',
        type: dto_1.KeyResolutionResponseDto,
        examples: key_resolution_examples_1.KeyResolutionExamples.SUCCESS_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 404,
        description: 'Not Found - Key does not exist or is canceled',
        examples: key_resolution_examples_1.KeyResolutionExamples.NOT_FOUND_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 422,
        description: 'Unprocessable Entity - Key is suspended or has invalid format',
        examples: key_resolution_examples_1.KeyResolutionExamples.UNPROCESSABLE_ENTITY_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 502,
        description: 'Bad Gateway - DIFE service error',
        examples: key_resolution_examples_1.KeyResolutionExamples.BAD_GATEWAY_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 504,
        description: 'Gateway Timeout - DIFE response timeout',
        examples: key_resolution_examples_1.KeyResolutionExamples.GATEWAY_TIMEOUT_RESPONSES
    }), (0, swagger_1.ApiResponse)({
        status: 500,
        description: 'Internal Server Error - Charon internal error',
        examples: key_resolution_examples_1.KeyResolutionExamples.INTERNAL_SERVER_ERROR_RESPONSES
    }));
}
exports.ApiKeyResolutionDocs = ApiKeyResolutionDocs;
//# sourceMappingURL=api-key-resolution-docs.decorator.js.map