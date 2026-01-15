"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusMapper = void 0;
const common_1 = require("@nestjs/common");
const dto_1 = require("../../dto");
class HttpStatusMapper {
    static mapResponseCodeToHttpStatus(responseCode) {
        switch (responseCode) {
            case dto_1.TransferResponseCode.APPROVED:
                return common_1.HttpStatus.OK;
            case dto_1.TransferResponseCode.SUCCESSFUL:
                return common_1.HttpStatus.OK;
            case dto_1.TransferResponseCode.PENDING:
                return common_1.HttpStatus.CREATED;
            case dto_1.TransferResponseCode.VALIDATION_FAILED:
                return common_1.HttpStatus.BAD_REQUEST;
            case dto_1.TransferResponseCode.REJECTED_BY_PROVIDER:
                return common_1.HttpStatus.UNPROCESSABLE_ENTITY;
            case dto_1.TransferResponseCode.PROVIDER_ERROR:
                return common_1.HttpStatus.BAD_GATEWAY;
            case dto_1.TransferResponseCode.ERROR:
                return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
            default:
                return common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        }
    }
}
exports.HttpStatusMapper = HttpStatusMapper;
//# sourceMappingURL=http-status.mapper.js.map