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
var PendingTransferService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingTransferService = void 0;
const common_1 = require("@nestjs/common");
const themis_1 = require("themis");
const model_1 = require("../model");
const dto_1 = require("../../infrastructure/entrypoint/dto");
const provider_1 = require("../provider");
const dto_2 = require("../../infrastructure/provider/http-clients/dto");
const transfer_config_service_1 = require("../../configuration/transfer-config.service");
const external_services_config_service_1 = require("../../configuration/external-services-config.service");
let PendingTransferService = PendingTransferService_1 = class PendingTransferService {
    constructor(loggerService, molPaymentProvider, transferConfig, externalServicesConfig) {
        this.loggerService = loggerService;
        this.molPaymentProvider = molPaymentProvider;
        this.transferConfig = transferConfig;
        this.externalServicesConfig = externalServicesConfig;
        this.pendingTransfers = new Map();
        this.CLEANUP_INTERVAL_MS = 60000;
        this.logger = this.loggerService.getLogger(PendingTransferService_1.name, themis_1.ThLoggerComponent.SERVICE);
        this.TIMEOUT_MS = this.transferConfig.getTransferTimeout();
        this.POLLING_START_DELAY_MS = this.transferConfig.getWebhookPollingStartDelay();
        this.POLLING_INTERVAL_MS = this.transferConfig.getPollingInterval();
        this.MOL_QUERY_TIMEOUT_MS = this.externalServicesConfig.getMolQueryTimeout();
        this.ENABLE_MOL_POLLING = this.transferConfig.isPollingEnabled();
        if (process.env.NODE_ENV !== 'test') {
            this.startCleanupInterval();
        }
    }
    async waitForConfirmation(transactionId, endToEndId, startedAt) {
        this.handleDuplicateEndToEndId(transactionId, endToEndId);
        this.logger.log('Registering pending transfer', {
            transactionId,
            endToEndId,
            timeoutMs: this.TIMEOUT_MS,
            currentPending: this.pendingTransfers.size,
            eventId: transactionId,
            traceId: transactionId,
            correlationId: endToEndId
        });
        return this.registerPendingTransfer(transactionId, endToEndId, startedAt);
    }
    resolveConfirmation(endToEndId, response, source = 'webhook') {
        const pending = this.pendingTransfers.get(endToEndId);
        if (!pending) {
            this.logUnknownConfirmation(endToEndId, response.responseCode);
            return false;
        }
        const finalState = response.responseCode;
        this.logConfirmationResolution(pending, endToEndId, finalState, source);
        this.completePendingConfirmation(pending, endToEndId, response);
        return true;
    }
    getPendingCount() {
        return this.pendingTransfers.size;
    }
    getTransactionIdByEndToEndId(endToEndId) {
        const pending = this.pendingTransfers.get(endToEndId);
        return pending?.transactionId;
    }
    clearAll() {
        this.logger.log('Clearing all pending transfers', {
            count: this.pendingTransfers.size
        });
        this.pendingTransfers.forEach((pending, endToEndId) => {
            clearTimeout(pending.timeoutId);
            if (pending.pollingTimeoutId) {
                clearTimeout(pending.pollingTimeoutId);
            }
            setImmediate(() => {
                try {
                    pending.reject(new Error('Service shutting down'));
                }
                catch (error) {
                    this.logger.error('Error clearing pending transfer', {
                        endToEndId,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });
        });
        this.pendingTransfers.clear();
    }
    onModuleDestroy() {
        this.logger.log('PendingTransferService shutting down', {
            eventId: 'shutdown',
            traceId: 'shutdown',
            correlationId: 'shutdown',
            pendingCount: this.pendingTransfers.size
        });
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = undefined;
        }
        this.clearAll();
    }
    startCleanupInterval() {
        this.cleanupIntervalId = setInterval(() => {
            this.performCleanup();
        }, this.CLEANUP_INTERVAL_MS);
    }
    performCleanup() {
        const now = Date.now();
        const staleThreshold = this.TIMEOUT_MS + 10000;
        let cleanedCount = 0;
        this.pendingTransfers.forEach((pending, endToEndId) => {
            const age = now - pending.createdAt;
            if (age > staleThreshold) {
                this.logger.warn('Cleaning up stale pending transfer', {
                    endToEndId,
                    transactionId: pending.transactionId,
                    ageMs: age
                });
                clearTimeout(pending.timeoutId);
                this.pendingTransfers.delete(endToEndId);
                cleanedCount++;
            }
        });
        if (cleanedCount > 0) {
            this.logger.log('Cleanup completed', {
                cleanedCount,
                remainingCount: this.pendingTransfers.size
            });
        }
    }
    handleDuplicateEndToEndId(transactionId, endToEndId) {
        const existing = this.pendingTransfers.get(endToEndId);
        if (!existing) {
            return;
        }
        this.logger.warn('Duplicate endToEndId detected, rejecting previous', {
            endToEndId,
            transactionId
        });
        clearTimeout(existing.timeoutId);
        if (existing.pollingTimeoutId) {
            clearTimeout(existing.pollingTimeoutId);
        }
        existing.reject(new Error('Duplicate request detected'));
        this.pendingTransfers.delete(endToEndId);
    }
    async registerPendingTransfer(transactionId, endToEndId, startedAt) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const baseTime = startedAt ?? now;
            const elapsedBeforeRegistration = now - baseTime;
            const remainingTimeoutMs = Math.max(this.TIMEOUT_MS - elapsedBeforeRegistration, 0);
            const pollingDelayMs = Math.max(this.POLLING_START_DELAY_MS - elapsedBeforeRegistration, 0);
            const timeoutId = setTimeout(() => {
                const pending = this.pendingTransfers.get(endToEndId);
                if (pending && !pending.isResolved) {
                    this.pendingTransfers.delete(endToEndId);
                    this.logger.warn('Transfer timeout - confirmation not received', {
                        transactionId,
                        endToEndId,
                        timeoutMs: this.TIMEOUT_MS,
                        remainingPending: this.pendingTransfers.size
                    });
                    reject(new Error('The final response from the provider was never received.'));
                }
            }, remainingTimeoutMs);
            const pollingTimeoutId = setTimeout(() => {
                void this.startPollingFallback(transactionId, endToEndId);
            }, pollingDelayMs);
            this.pendingTransfers.set(endToEndId, {
                transactionId,
                endToEndId,
                resolve,
                reject,
                timeoutId,
                pollingTimeoutId,
                createdAt: baseTime,
                startedAt: baseTime,
                isResolved: false,
                pollingAttempts: 0
            });
        });
    }
    logUnknownConfirmation(endToEndId, finalState) {
        const transactionId = this.getTransactionIdByEndToEndId(endToEndId) || endToEndId;
        this.logger.warn('Confirmation received for unknown or expired transfer', {
            eventId: transactionId,
            traceId: transactionId,
            correlationId: endToEndId,
            transactionId,
            endToEndId,
            finalState,
            currentPending: this.pendingTransfers.size
        });
    }
    logConfirmationResolution(pending, endToEndId, finalState, source) {
        const resolvedAt = Date.now();
        const totalDurationMs = resolvedAt - pending.startedAt;
        const totalDurationSeconds = Math.round((totalDurationMs / 1000) * 100) / 100;
        const registrationDelayMs = pending.createdAt - pending.startedAt;
        const waitingDurationMs = resolvedAt - pending.createdAt;
        const logData = {
            eventId: pending.transactionId,
            traceId: pending.transactionId,
            correlationId: endToEndId,
            transactionId: pending.transactionId,
            endToEndId,
            finalState,
            resolutionSource: source,
            totalDurationMs,
            totalDurationSeconds,
            registrationDelayMs,
            waitingDurationMs,
            startedAt: new Date(pending.startedAt).toISOString(),
            registeredAt: new Date(pending.createdAt).toISOString(),
            resolvedAt: new Date(resolvedAt).toISOString(),
            remainingPending: this.pendingTransfers.size - 1
        };
        if (source === 'polling' && pending.pollingAttempts !== undefined) {
            logData.pollingAttempts = pending.pollingAttempts;
        }
        this.logger.log('Transfer final state resolved', logData);
    }
    completePendingConfirmation(pending, endToEndId, response) {
        clearTimeout(pending.timeoutId);
        if (pending.pollingTimeoutId) {
            clearTimeout(pending.pollingTimeoutId);
        }
        pending.isResolved = true;
        this.pendingTransfers.delete(endToEndId);
        try {
            pending.resolve(response);
        }
        catch (error) {
            this.logger.error('Error resolving confirmation', {
                endToEndId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    async startPollingFallback(transactionId, endToEndId) {
        this.logger.log('Starting MOL polling support', {
            transactionId,
            endToEndId,
            startDelayMs: this.POLLING_START_DELAY_MS,
            intervalMs: this.POLLING_INTERVAL_MS,
            queryTimeoutMs: this.MOL_QUERY_TIMEOUT_MS,
            totalTimeoutMs: this.TIMEOUT_MS,
            pollingEnabled: this.ENABLE_MOL_POLLING,
            note: this.ENABLE_MOL_POLLING
                ? 'Polling runs continuously until timeout or success'
                : 'Polling disabled - webhook only mode'
        });
        if (!this.ENABLE_MOL_POLLING) {
            this.logger.log('MOL polling disabled by feature flag', {
                transactionId,
                endToEndId,
                featureFlag: 'transfer.enablePolling',
                value: this.ENABLE_MOL_POLLING
            });
            return;
        }
        let attempts = 0;
        const poll = async () => {
            attempts++;
            const pending = this.pendingTransfers.get(endToEndId);
            if (pending) {
                pending.pollingAttempts = attempts;
            }
            try {
                const pending = this.pendingTransfers.get(endToEndId);
                if (!pending || pending.isResolved) {
                    const pending = this.pendingTransfers.get(endToEndId);
                    const transactionId = pending?.transactionId || endToEndId;
                    this.logger.log('Polling stopped - transfer already resolved', {
                        eventId: transactionId,
                        traceId: transactionId,
                        correlationId: endToEndId,
                        transactionId,
                        endToEndId,
                        attempts
                    });
                    return;
                }
                const elapsedMs = Date.now() - pending.createdAt;
                const timeUntilTimeout = this.TIMEOUT_MS - elapsedMs;
                if (timeUntilTimeout <= 0) {
                    this.logger.log('Polling stopped - main timeout reached', {
                        eventId: transactionId,
                        traceId: transactionId,
                        correlationId: endToEndId,
                        transactionId,
                        endToEndId,
                        attempts,
                        elapsedMs,
                        timeoutMs: this.TIMEOUT_MS
                    });
                    return;
                }
                if (timeUntilTimeout < this.MOL_QUERY_TIMEOUT_MS) {
                    this.logger.log('Polling stopped - insufficient time for MOL query before timeout', {
                        eventId: transactionId,
                        traceId: transactionId,
                        correlationId: endToEndId,
                        transactionId,
                        endToEndId,
                        attempts,
                        timeUntilTimeout,
                        queryTimeoutMs: this.MOL_QUERY_TIMEOUT_MS
                    });
                    return;
                }
                this.logger.log('Polling MOL for transfer status', {
                    eventId: transactionId,
                    traceId: transactionId,
                    correlationId: endToEndId,
                    transactionId,
                    endToEndId,
                    attempt: attempts,
                    timeUntilTimeout
                });
                const queryRequest = dto_2.MolPaymentQueryRequestDto.byEndToEndId(endToEndId);
                const response = await this.molPaymentProvider.queryPaymentStatus(queryRequest, this.MOL_QUERY_TIMEOUT_MS);
                if (this.isSuccessfulMolResponse(response)) {
                    if (!response.items || response.items.length === 0) {
                        this.logger.log('MOL polling returned empty items - payment not found yet', {
                            eventId: transactionId,
                            traceId: transactionId,
                            correlationId: endToEndId,
                            transactionId,
                            endToEndId,
                            attempts,
                            timeUntilTimeout
                        });
                    }
                    else {
                        const finalState = this.mapMolStatusToTransferResponseCode(response.items[0]?.status);
                        const confirmationResponse = {
                            transactionId: endToEndId,
                            responseCode: finalState,
                            message: finalState === dto_1.TransferResponseCode.APPROVED ? 'Payment approved' : 'Payment declined',
                            externalTransactionId: endToEndId,
                            additionalData: {
                                [model_1.AdditionalDataKey.END_TO_END]: endToEndId,
                                [model_1.AdditionalDataKey.EXECUTION_ID]: transactionId
                            }
                        };
                        this.logger.log('MOL polling returned successful response - resolving confirmation', {
                            eventId: transactionId,
                            traceId: transactionId,
                            correlationId: endToEndId,
                            transactionId,
                            endToEndId,
                            attempts,
                            status: response.items[0]?.status,
                            finalState
                        });
                        this.resolveConfirmation(endToEndId, confirmationResponse, 'polling');
                        return;
                    }
                }
                const timeForNextAttempt = this.POLLING_INTERVAL_MS + this.MOL_QUERY_TIMEOUT_MS;
                if (timeUntilTimeout < timeForNextAttempt) {
                    this.logger.log('Polling stopped - insufficient time for next attempt before timeout', {
                        transactionId,
                        endToEndId,
                        attempts,
                        timeUntilTimeout,
                        timeForNextAttempt,
                        pollingInterval: this.POLLING_INTERVAL_MS,
                        queryTimeoutMs: this.MOL_QUERY_TIMEOUT_MS
                    });
                    return;
                }
                this.logger.log('MOL polling - response not successful, scheduling next attempt', {
                    transactionId,
                    endToEndId,
                    attempts,
                    nextAttemptIn: this.POLLING_INTERVAL_MS,
                    lastStatus: response.items?.[0]?.status ?? 'NO_ITEMS',
                    hasErrors: response.errors?.length ? response.errors.length > 0 : false,
                    timeUntilTimeout
                });
                setTimeout(() => {
                    void poll();
                }, this.POLLING_INTERVAL_MS);
            }
            catch (error) {
                this.logger.warn('ERROR: MOL polling error', {
                    transactionId,
                    endToEndId,
                    attempts,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
                const pending = this.pendingTransfers.get(endToEndId);
                if (pending) {
                    const elapsedMs = Date.now() - pending.createdAt;
                    const timeUntilTimeout = this.TIMEOUT_MS - elapsedMs;
                    if (timeUntilTimeout < this.MOL_QUERY_TIMEOUT_MS) {
                        this.logger.log('Polling retry stopped - insufficient time for MOL query before timeout', {
                            transactionId,
                            endToEndId,
                            attempts,
                            timeUntilTimeout,
                            queryTimeoutMs: this.MOL_QUERY_TIMEOUT_MS
                        });
                        return;
                    }
                }
                setTimeout(() => {
                    void poll();
                }, this.POLLING_INTERVAL_MS);
            }
        };
        await poll();
    }
    isSuccessfulMolResponse(response) {
        const finalStatuses = ['COMPLETED', 'SUCCESS', 'ERROR', 'REJECTED', 'SETTLED'];
        const status = response?.items?.[0]?.status?.toUpperCase();
        return (response &&
            Array.isArray(response.items) &&
            response.items.length > 0 &&
            !response.errors?.length &&
            status &&
            finalStatuses.includes(status));
    }
    mapMolStatusToTransferResponseCode(molStatus) {
        const normalizedStatus = (molStatus || '').toUpperCase();
        switch (normalizedStatus) {
            case 'COMPLETED':
            case 'SUCCESS':
            case 'SETTLED':
            case 'APPROVED':
                return dto_1.TransferResponseCode.APPROVED;
            case 'FAILED':
            case 'ERROR':
            case 'REJECTED':
                return dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
            case 'PROCESSING':
            case 'PENDING':
                return dto_1.TransferResponseCode.APPROVED;
            default:
                this.logger.warn('Unknown MOL status, defaulting to REJECTED_BY_PROVIDER', {
                    molStatus
                });
                return dto_1.TransferResponseCode.REJECTED_BY_PROVIDER;
        }
    }
};
exports.PendingTransferService = PendingTransferService;
__decorate([
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('wait-confirmation'),
        tags: ['transfer', 'confirmation', 'pending']
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number]),
    __metadata("design:returntype", Promise)
], PendingTransferService.prototype, "waitForConfirmation", null);
__decorate([
    (0, themis_1.ThTraceEvent)({
        eventType: new themis_1.ThEventTypeBuilder().setDomain('transfer').setAction('resolve-confirmation'),
        tags: ['transfer', 'confirmation', 'resolve']
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Boolean)
], PendingTransferService.prototype, "resolveConfirmation", null);
exports.PendingTransferService = PendingTransferService = PendingTransferService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [themis_1.ThLoggerService,
        provider_1.IMolPaymentProvider,
        transfer_config_service_1.TransferConfigService,
        external_services_config_service_1.ExternalServicesConfigService])
], PendingTransferService);
//# sourceMappingURL=pending-transfer.service.js.map