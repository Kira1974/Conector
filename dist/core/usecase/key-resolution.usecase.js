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
var KeyResolutionUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyResolutionUseCase = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const provider_1 = require("../provider");
const util_1 = require("../util");
const custom_exceptions_1 = require("../exception/custom.exceptions");
const error_message_mapper_1 = require("../util/error-message.mapper");
let KeyResolutionUseCase = KeyResolutionUseCase_1 = class KeyResolutionUseCase {
    constructor(difeProvider, loggerService) {
        this.difeProvider = difeProvider;
        this.loggerService = loggerService;
        this.logger = this.loggerService.getLogger(KeyResolutionUseCase_1.name, themis_1.ThLoggerComponent.APPLICATION);
    }
    async execute(key) {
        try {
            const keyType = (0, util_1.calculateKeyType)(key);
            const correlationId = (0, util_1.generateCorrelationId)();
            this.logger.log('Retrieving key information', {
                correlationId,
                keyType,
                keyLength: key.length
            });
            const request = {
                correlationId,
                key,
                keyType
            };
            const keyResolution = await this.difeProvider.resolveKey(request);
            if (keyResolution.errors && keyResolution.errors.length > 0) {
                const errorMessage = keyResolution.errors.join(', ');
                this.logger.warn('DIFE returned errors', {
                    correlationId,
                    errors: keyResolution.errors
                });
                return this.buildErrorResponse(key, keyType, errorMessage);
            }
            if (!keyResolution.resolvedKey) {
                this.logger.error('Key information response missing resolvedKey', {
                    correlationId
                });
                return this.buildErrorResponse(key, keyType, 'Key resolution failed');
            }
            const response = this.buildSuccessResponse(key, keyType, keyResolution);
            this.logger.log('Key information retrieved successfully', {
                correlationId,
                documentType: response.documentType,
                accountType: response.accountType,
                personType: response.personType
            });
            return response;
        }
        catch (error) {
            return this.handleError(error, key);
        }
    }
    buildSuccessResponse(key, keyType, keyResolution) {
        const resolvedKey = keyResolution.resolvedKey;
        const person = resolvedKey.person;
        const paymentMethod = resolvedKey.paymentMethod;
        const additionalData = (0, util_1.buildAdditionalDataFromKeyResolution)(keyResolution);
        const personName = additionalData.OBFUSCATED_NAME || '';
        const accountNumber = additionalData.ACCOUNT_NUMBER || '';
        return {
            documentNumber: person.identificationNumber,
            documentType: person.identificationType,
            personName,
            personType: person.personType,
            financialEntityNit: resolvedKey.participant.nit,
            accountType: paymentMethod.type,
            accountNumber,
            key,
            keyType,
            responseCode: 'SUCCESS'
        };
    }
    buildErrorResponse(key, keyType, errorMessage) {
        const errorCodeMatch = errorMessage.match(/\(([A-Z]+-\d{4})\)/) || errorMessage.match(/^([A-Z]+-\d+)/);
        const networkCode = errorCodeMatch ? errorCodeMatch[1] : undefined;
        let networkMessage = errorMessage;
        if (errorCodeMatch) {
            const descriptionMatch = errorMessage.match(/DIFE API error: (.+?) \([A-Z]+-\d{4}\)/);
            if (descriptionMatch) {
                networkMessage = descriptionMatch[1];
            }
            else {
                networkMessage = errorMessage.replace(/^[A-Z]+-\d+:\s*/, '').trim();
            }
        }
        const errorInfo = {
            code: networkCode,
            description: networkMessage,
            source: 'DIFE'
        };
        const transferMessage = error_message_mapper_1.ErrorMessageMapper.mapToMessage(errorInfo);
        const formattedNetworkMessage = networkCode
            ? error_message_mapper_1.ErrorMessageMapper.formatNetworkErrorMessage(networkMessage, 'DIFE')
            : networkMessage;
        return {
            key,
            keyType,
            responseCode: 'ERROR',
            message: transferMessage,
            networkCode,
            networkMessage: formattedNetworkMessage
        };
    }
    handleError(error, key) {
        const keyType = (0, util_1.calculateKeyType)(key);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.logger.error('Key information retrieval failed', {
            key: `${key.substring(0, 5)}***`,
            error: errorMessage
        });
        if (error instanceof custom_exceptions_1.KeyResolutionException) {
            return this.buildErrorResponse(key, keyType, error.message);
        }
        return this.buildErrorResponse(key, keyType, errorMessage);
    }
};
exports.KeyResolutionUseCase = KeyResolutionUseCase;
exports.KeyResolutionUseCase = KeyResolutionUseCase = KeyResolutionUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [provider_1.IDifeProvider,
        themis_1.ThLoggerService])
], KeyResolutionUseCase);
//# sourceMappingURL=key-resolution.usecase.js.map