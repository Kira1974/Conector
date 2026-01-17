import { Controller, Post, Body, Res, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThTraceEvent,
  ThEventTypeBuilder,
  ThStandardResponse,
  ThHttpRequestTracingInterceptor,
  ThHttpResponseTracingInterceptor
} from 'themis';

import { TransferUseCase } from '@core/usecase';

import { TransferRequestDto } from '../dto';

import { HttpStatusMapper } from './util/http-status.mapper';

@Controller('transfer')
@UseInterceptors(ThHttpRequestTracingInterceptor, ThHttpResponseTracingInterceptor)
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

    const { responseCode, message, ...rest } = responseDto;

    const standardResponse: ThStandardResponse<typeof rest & { state: string }> = {
      code: httpStatus,
      message,
      data: {
        state: responseCode,
        ...rest,
      }
    };

    this.logger.log('CHARON Response', {
      status: httpStatus,
      transactionId: responseDto.transactionId,
      endToEndId,
      state: responseDto.responseCode,
      responseBody: JSON.stringify(standardResponse, null, 2)
    });

    return res.status(httpStatus).json(standardResponse);
  }
}
