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
    this.logger.log('Transfer request received', {
      amount: request.transaction.amount.value,
      currency: request.transaction.amount.currency,
      transactionId: request.transactionId
    });

    const responseDto = await this.transferUseCase.executeTransfer(request);

    const httpStatus = HttpStatusMapper.mapResponseCodeToHttpStatus(responseDto.responseCode);

    return res.status(httpStatus).json(responseDto);
  }
}
