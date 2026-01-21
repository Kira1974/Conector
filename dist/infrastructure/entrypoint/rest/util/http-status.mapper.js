"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusMapper = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const dto_1 = require("../../dto");
const ThAppStatusToHttpStatus = {
    [themis_1.ThAppStatusCode.SUCCESS]: common_1.HttpStatus.OK,
    [themis_1.ThAppStatusCode.CREATED]: common_1.HttpStatus.CREATED,
    [themis_1.ThAppStatusCode.ACCEPTED]: common_1.HttpStatus.ACCEPTED,
    [themis_1.ThAppStatusCode.NO_CONTENT]: common_1.HttpStatus.NO_CONTENT,
    [themis_1.ThAppStatusCode.BAD_REQUEST]: common_1.HttpStatus.BAD_REQUEST,
    [themis_1.ThAppStatusCode.UNAUTHORIZED]: common_1.HttpStatus.UNAUTHORIZED,
    [themis_1.ThAppStatusCode.FORBIDDEN]: common_1.HttpStatus.FORBIDDEN,
    [themis_1.ThAppStatusCode.NOT_FOUND]: common_1.HttpStatus.NOT_FOUND,
    [themis_1.ThAppStatusCode.CONFLICT]: common_1.HttpStatus.CONFLICT,
    [themis_1.ThAppStatusCode.VALIDATION_ERROR]: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
    [themis_1.ThAppStatusCode.INTERNAL_ERROR]: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
    [themis_1.ThAppStatusCode.SERVICE_UNAVAILABLE]: common_1.HttpStatus.SERVICE_UNAVAILABLE,
    [themis_1.ThAppStatusCode.TIMEOUT]: common_1.HttpStatus.GATEWAY_TIMEOUT,
    [themis_1.ThAppStatusCode.BUSINESS_ERROR]: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
    [themis_1.ThAppStatusCode.DATA_INTEGRITY_ERROR]: common_1.HttpStatus.CONFLICT,
    [themis_1.ThAppStatusCode.EXTERNAL_SERVICE_ERROR]: common_1.HttpStatus.BAD_GATEWAY,
    [themis_1.ThAppStatusCode.RATE_LIMIT_EXCEEDED]: common_1.HttpStatus.TOO_MANY_REQUESTS,
    [themis_1.ThAppStatusCode.RESOURCE_LOCKED]: common_1.HttpStatus.LOCKED,
    [themis_1.ThAppStatusCode.PROCESSING_RETRIES_EXCEEDED]: common_1.HttpStatus.SERVICE_UNAVAILABLE,
    [themis_1.ThAppStatusCode.NO_RETRIES_CONFIGURED]: common_1.HttpStatus.SERVICE_UNAVAILABLE
};
class HttpStatusMapper {
    static mapResponseCodeToHttpStatus(responseCode) {
        switch (responseCode) {
            case dto_1.TransferResponseCode.APPROVED:
                return common_1.HttpStatus.OK;
            case dto_1.TransferResponseCode.PENDING:
                return common_1.HttpStatus.OK;
            case dto_1.TransferResponseCode.VALIDATION_FAILED:
                return common_1.HttpStatus.BAD_REQUEST;
            case dto_1.TransferResponseCode.REJECTED_BY_PROVIDER:
                return common_1.HttpStatus.UNPROCESSABLE_ENTITY;
            case dto_1.TransferResponseCode.ERROR:
                return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            default:
                return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }
    static mapThAppStatusCodeToHttpStatus(code) {
        return ThAppStatusToHttpStatus[code] ?? common_1.HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
exports.HttpStatusMapper = HttpStatusMapper;
//# sourceMappingURL=http-status.mapper.js.map