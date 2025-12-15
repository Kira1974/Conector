import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ThLogger, ThLoggerService, ThLoggerComponent, ThTraceEvent, ThEventTypeBuilder } from 'themis';

import { TransferUseCase } from '@core/usecase';

import { TransferRequestDto } from '../dto';

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
    const eventId = request.transactionId;
    const traceId = request.transactionId;
    const correlationId = request.transactionId;

    this.logger.log('CHARON Request', {
      method: 'POST',
      transactionId: request.transactionId,
      eventId,
      traceId,
      correlationId,
      amount: request.transaction.amount.value,
      currency: request.transaction.amount.currency,
      requestBody: JSON.stringify(request, null, 2)
    });

    const responseDto = await this.transferUseCase.executeTransfer(request);

    const httpStatus = HttpStatusMapper.mapResponseCodeToHttpStatus(responseDto.responseCode);
    const endToEndId = (responseDto.additionalData as Record<string, string> | undefined)?.END_TO_END;
    const finalCorrelationId = endToEndId || responseDto.transactionId;

    this.logger.log('CHARON Response', {
      status: httpStatus,
      transactionId: responseDto.transactionId,
      eventId,
      traceId,
      correlationId: finalCorrelationId,
      endToEndId,
      responseCode: responseDto.responseCode,
      responseBody: JSON.stringify(responseDto, null, 2)
    });

    return res.status(httpStatus).json(responseDto);
  }
}
