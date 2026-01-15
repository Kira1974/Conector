import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThTraceEvent,
  ThEventTypeBuilder,
  ThStandardResponse
} from 'themis';

import { TransferUseCase } from '@core/usecase';

import { TransferRequestDto, TransferResponseDto } from '../dto';

import { HttpStatusMapper } from './util/http-status.mapper';

@Controller('transfer')
export class TransferController {
  private readonly logger: ThLogger;

  constructor(
    private readonly transferUseCase: TransferUseCase,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(TransferController.name, ThLoggerComponent.CONTROLLER);
  }

  @Post()
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('process'),
    tags: ['transfer', 'payment']
  })
  async transfer(@Body() request: TransferRequestDto, @Res() res: Response): Promise<Response> {
    const eventId = request.transaction.id;
    const traceId = request.transaction.id;
    const correlationId = request.transaction.id;

    this.logger.log('CHARON Request', {
      method: 'POST',
      transactionId: request.transaction.id,
      eventId,
      traceId,
      correlationId,
      amount: request.transaction.amount.total,
      currency: request.transaction.amount.currency,
      requestBody: JSON.stringify(request, null, 2)
    });

    const responseDto = await this.transferUseCase.executeTransfer(request);

    const httpStatus = HttpStatusMapper.mapResponseCodeToHttpStatus(responseDto.responseCode);
    const endToEndId = (responseDto.additionalData as Record<string, string> | undefined)?.END_TO_END;
    const finalCorrelationId = endToEndId || responseDto.transactionId;

    // Transform to external response format (aligned with documentation pages 7-10)
    // Change 'responseCode' to 'state' in the response data
    const responseData = {
      state: responseDto.responseCode,
      transactionId: responseDto.transactionId,
      externalTransactionId: responseDto.externalTransactionId,
      additionalData: responseDto.additionalData
    };

    const standardResponse: ThStandardResponse<typeof responseData> = {
      code: httpStatus,
      message: responseDto.message,
      data: responseData
    };

    this.logger.log('CHARON Response', {
      status: httpStatus,
      transactionId: responseDto.transactionId,
      eventId,
      traceId,
      correlationId: finalCorrelationId,
      endToEndId,
      state: responseDto.responseCode,
      responseBody: JSON.stringify(standardResponse, null, 2)
    });

    return res.status(httpStatus).json(standardResponse);
  }
}
