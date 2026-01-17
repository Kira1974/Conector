import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { AdditionalDataKey, ConfirmationResponse } from '@core/model';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto';
import { IMolPaymentProvider } from '@core/provider';
import { MolPaymentQueryRequestDto, MolPaymentQueryResponseDto } from '@infrastructure/provider/http-clients/dto';
import { TransferConfigService } from '@config/transfer-config.service';
import { ExternalServicesConfigService } from '@config/external-services-config.service';

type ConfirmationSource = 'webhook' | 'polling';

interface PendingTransfer {
  transactionId: string;
  endToEndId: string;
  resolve: (response: ConfirmationResponse) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
  pollingTimeoutId?: NodeJS.Timeout;
  createdAt: number;
  isResolved: boolean;
  startedAt: number;
  pollingAttempts?: number;
}

@Injectable()
export class PendingTransferService implements OnModuleDestroy {
  private readonly logger: ThLogger;
  private readonly pendingTransfers = new Map<string, PendingTransfer>();
  private readonly TIMEOUT_MS: number;
  private readonly POLLING_START_DELAY_MS: number;
  private readonly POLLING_INTERVAL_MS: number;
  private readonly MOL_QUERY_TIMEOUT_MS: number;
  private readonly ENABLE_MOL_POLLING: boolean;
  private readonly CLEANUP_INTERVAL_MS = 60000;
  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(
    private readonly loggerService: ThLoggerService,
    private readonly molPaymentProvider: IMolPaymentProvider,
    private readonly transferConfig: TransferConfigService,
    private readonly externalServicesConfig: ExternalServicesConfigService
  ) {
    this.logger = this.loggerService.getLogger(PendingTransferService.name, ThLoggerComponent.SERVICE);
    this.TIMEOUT_MS = this.transferConfig.getTransferTimeout();
    this.POLLING_START_DELAY_MS = this.transferConfig.getWebhookPollingStartDelay();
    this.POLLING_INTERVAL_MS = this.transferConfig.getPollingInterval();
    this.MOL_QUERY_TIMEOUT_MS = this.externalServicesConfig.getMolQueryTimeout();
    this.ENABLE_MOL_POLLING = this.transferConfig.isPollingEnabled();

    if (this.transferConfig.isCleanupIntervalEnabled()) {
      this.startCleanupInterval();
    }
  }

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('wait-confirmation'),
    tags: ['transfer', 'confirmation', 'pending']
  })
  async waitForConfirmation(
    transactionId: string,
    endToEndId: string,
    startedAt?: number
  ): Promise<ConfirmationResponse> {
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

  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('resolve-confirmation'),
    tags: ['transfer', 'confirmation', 'resolve']
  })
  resolveConfirmation(
    endToEndId: string,
    response: ConfirmationResponse,
    source: ConfirmationSource = 'webhook'
  ): boolean {
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

  getPendingCount(): number {
    return this.pendingTransfers.size;
  }

  getTransactionIdByEndToEndId(endToEndId: string): string | undefined {
    const pending = this.pendingTransfers.get(endToEndId);
    return pending?.transactionId;
  }

  clearAll(): void {
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
        } catch (error) {
          this.logger.error('Error clearing pending transfer', {
            endToEndId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
    });

    this.pendingTransfers.clear();
  }

  onModuleDestroy(): void {
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

  private startCleanupInterval(): void {
    this.cleanupIntervalId = setInterval(() => {
      this.performCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  private performCleanup(): void {
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

  private handleDuplicateEndToEndId(transactionId: string, endToEndId: string): void {
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

  private async registerPendingTransfer(
    transactionId: string,
    endToEndId: string,
    startedAt?: number
  ): Promise<ConfirmationResponse> {
    return new Promise<ConfirmationResponse>((resolve, reject) => {
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

  private logUnknownConfirmation(endToEndId: string, finalState: TransferResponseCode): void {
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

  private logConfirmationResolution(
    pending: PendingTransfer,
    endToEndId: string,
    finalState: TransferResponseCode,
    source: ConfirmationSource
  ): void {
    const resolvedAt = Date.now();
    const totalDurationMs = resolvedAt - pending.startedAt;
    const totalDurationSeconds = Math.round((totalDurationMs / 1000) * 100) / 100;
    const registrationDelayMs = pending.createdAt - pending.startedAt;
    const waitingDurationMs = resolvedAt - pending.createdAt;

    const logData: Record<string, unknown> = {
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

  private completePendingConfirmation(
    pending: PendingTransfer,
    endToEndId: string,
    response: ConfirmationResponse
  ): void {
    clearTimeout(pending.timeoutId);
    if (pending.pollingTimeoutId) {
      clearTimeout(pending.pollingTimeoutId);
    }
    pending.isResolved = true;
    this.pendingTransfers.delete(endToEndId);

    try {
      pending.resolve(response);
    } catch (error) {
      this.logger.error('Error resolving confirmation', {
        endToEndId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async startPollingFallback(transactionId: string, endToEndId: string): Promise<void> {
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

    // Check if polling is disabled
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

    const poll = async (): Promise<void> => {
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

        // Check if main timeout would expire before next polling attempt
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

        // Only attempt polling if we have enough time for the request
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

        const queryRequest = MolPaymentQueryRequestDto.byEndToEndId(endToEndId);
        const response = await this.molPaymentProvider.queryPaymentStatus(queryRequest, this.MOL_QUERY_TIMEOUT_MS);

        if (this.isSuccessfulMolResponse(response)) {
          // Check if items exist and have at least one element
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
          } else {
            const finalState = this.mapMolStatusToTransferResponseCode(response.items[0]?.status);
            const confirmationResponse: ConfirmationResponse = {
              transactionId: endToEndId,
              responseCode: finalState,
              message: finalState === TransferResponseCode.APPROVED ? 'Payment approved' : 'Payment declined',
              externalTransactionId: endToEndId,
              additionalData: {
                [AdditionalDataKey.END_TO_END]: endToEndId,
                [AdditionalDataKey.EXECUTION_ID]: transactionId
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

        // If response is not successful, check if we can schedule next attempt
        // Only schedule next attempt if we have enough time for both the interval and the next query
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
      } catch (error) {
        this.logger.warn('ERROR: MOL polling error', {
          transactionId,
          endToEndId,
          attempts,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Check if we can retry before timeout
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

  private isSuccessfulMolResponse(response: MolPaymentQueryResponseDto): boolean {
    const finalStatuses = ['COMPLETED', 'SUCCESS', 'ERROR', 'REJECTED', 'SETTLED'];
    const status = response?.items?.[0]?.status?.toUpperCase();
    return (
      response &&
      Array.isArray(response.items) &&
      response.items.length > 0 &&
      !response.errors?.length &&
      status &&
      finalStatuses.includes(status)
    );
  }

  private mapMolStatusToTransferResponseCode(molStatus: string): TransferResponseCode {
    const normalizedStatus = (molStatus || '').toUpperCase();
    switch (normalizedStatus) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'SETTLED':
      case 'APPROVED':
        return TransferResponseCode.APPROVED;
      case 'FAILED':
      case 'ERROR':
      case 'REJECTED':
        return TransferResponseCode.REJECTED_BY_PROVIDER;
      case 'PROCESSING':
      case 'PENDING':
        return TransferResponseCode.APPROVED; // PENDING transfers are treated as approved until final confirmation
      default:
        this.logger.warn('Unknown MOL status, defaulting to REJECTED_BY_PROVIDER', {
          molStatus
        });
        return TransferResponseCode.REJECTED_BY_PROVIDER;
    }
  }
}
