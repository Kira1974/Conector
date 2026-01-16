"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConfirmationUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationUseCase = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const model_1 = require("../model");
const transfer_confirmation_dto_1 = require("../../infrastructure/entrypoint/dto/transfer-confirmation.dto");
const dto_1 = require("../../infrastructure/entrypoint/dto");
const constant_1 = require("../constant");
const error_message_mapper_1 = require("../util/error-message.mapper");
const transfer_validation_util_1 = require("../util/transfer-validation.util");
const pending_transfer_service_1 = require("./pending-transfer.service");
let ConfirmationUseCase = ConfirmationUseCase_1 = class ConfirmationUseCase {
    constructor(pendingTransferService, loggerService) {
        this.pendingTransferService = pendingTransferService;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(ConfirmationUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
    }
    processConfirmation(notification) {
        const endToEndId = notification.payload.payload.end_to_end_id;
        const executionId = notification.payload.payload.execution_id;
        const settlementStatus = notification.payload.payload.status;
        const transactionId = this.pendingTransferService.getTransactionIdByEndToEndId(endToEndId) || endToEndId;
        const eventId = transactionId;
        const traceId = transactionId;
        const correlationId = endToEndId;
        this.logger.log('NETWORK_REQUEST WEBHOOK', {
            eventId,
            traceId,
            correlationId,
            transactionId,
            endToEndId,
            notificationId: notification.id,
            source: notification.source,
            externalTransactionId: endToEndId,
            executionId,
            settlementStatus,
            eventName: notification.payload.event_name,
            requestBody: JSON.stringify(notification, null, 2)
        });
        const finalState = this.mapSettlementStatusToFinalState(settlementStatus);
        let confirmationResponse;
        if (!finalState) {
            this.logger.warn('Unknown settlement status received', {
                eventId,
                traceId,
                correlationId,
                transactionId,
                endToEndId,
                settlementStatus,
                notificationId: notification.id
            });
            confirmationResponse = this.buildErrorResponse(notification);
            this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse, 'webhook');
            return confirmationResponse;
        }
        if (settlementStatus.toUpperCase() === 'ERROR' && notification.payload.payload.errors) {
            confirmationResponse = this.buildErrorResponse(notification);
        }
        else {
            confirmationResponse = this.buildSuccessResponse(endToEndId, executionId, finalState);
        }
        const resolved = this.pendingTransferService.resolveConfirmation(endToEndId, confirmationResponse, 'webhook');
        if (!resolved) {
            this.logger.warn('Confirmation for unknown or expired transfer', {
                eventId,
                traceId,
                correlationId,
                transactionId,
                endToEndId,
                finalState,
                settlementStatus,
                notificationId: notification.id
            });
            return this.buildNotFoundResponse(endToEndId, executionId);
        }
        this.logger.log('Transfer confirmation processed successfully', {
            eventId,
            traceId,
            correlationId,
            transactionId,
            endToEndId,
            executionId,
            finalState,
            notificationId: notification.id
        });
        return confirmationResponse;
    }
    mapSettlementStatusToFinalState(status) {
        const statusUpper = status.toUpperCase();
        switch (statusUpper) {
            case 'SUCCESS':
            case 'SETTLED':
                return dto_1.TransferResponseCode.APPROVED;
            case 'REJECTED':
            case 'ERROR':
                return dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
            default:
                return null;
        }
    }
    buildSuccessResponse(endToEndId, executionId, finalState) {
        return {
            transactionId: endToEndId,
            responseCode: finalState,
            message: finalState === dto_1.TransferResponseCode.APPROVED ? 'Payment approved' : 'Payment declined',
            externalTransactionId: endToEndId,
            additionalData: {
                [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
                [model_1.AdditionalDataKey.EXECUTION_ID]: executionId
            }
        };
    }
    buildErrorResponse(notification) {
        const endToEndId = notification.payload.payload.end_to_end_id;
        const executionId = notification.payload.payload.execution_id;
        const errors = notification.payload.payload.errors;
        let networkMessage;
        let networkCode;
        let mappedMessage = constant_1.TransferMessage.PAYMENT_DECLINED;
        if (errors && errors.length > 0) {
            const firstError = errors[0];
            networkCode = firstError.code;
            networkMessage = firstError.description;
            const errorInfo = {
                code: networkCode,
                description: networkMessage,
                source: 'MOL'
            };
            mappedMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
            const responseCode = (0, transfer_validation_util_1.determineResponseCodeFromMessage)(mappedMessage, true);
            return {
                transactionId: endToEndId,
                responseCode,
                message: mappedMessage,
                externalTransactionId: endToEndId,
                networkMessage: error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(networkMessage, 'MOL'),
                networkCode,
                additionalData: {
                    [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
                    [model_1.AdditionalDataKey.EXECUTION_ID]: executionId
                }
            };
        }
        return {
            transactionId: endToEndId,
            responseCode: dto_1.TransferResponseCode.ERROR,
            message: 'Unknown settlement status',
            externalTransactionId: endToEndId,
            additionalData: {
                [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
                [model_1.AdditionalDataKey.EXECUTION_ID]: executionId
            }
        };
    }
    buildNotFoundResponse(endToEndId, executionId) {
        return {
            transactionId: endToEndId,
            responseCode: dto_1.TransferResponseCode.PENDING,
            message: 'Payment pending',
            externalTransactionId: endToEndId,
            additionalData: {
                [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
                [model_1.AdditionalDataKey.EXECUTION_ID]: executionId
            }
        };
    }
};
exports.ConfirmationUseCase = ConfirmationUseCase;
__decorate([
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('confirm'),
        tags: ['transfer', 'confirmation']
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transfer_confirmation_dto_1.TransferConfirmationDto]),
    __metadata("design:returntype", Object)
], ConfirmationUseCase.prototype, "processConfirmation", null);
exports.ConfirmationUseCase = ConfirmationUseCase = ConfirmationUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pending_transfer_service_1.PendingTransferService,
        themis_1.ThLoggerService])
], ConfirmationUseCase);
//# sourceMappingURL=confirmation.usecase.js.map