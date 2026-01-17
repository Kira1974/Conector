import { Controller, Post, Body, HttpCode, HttpStatus, UseInterceptors } from '@nestjs/common';
import {
  ThTraceEvent,
  ThEventTypeBuilder,
  ThHttpRequestTracingInterceptor,
  ThHttpResponseTracingInterceptor
} from 'themis';

import { ConfirmationUseCase } from '@core/usecase/confirmation.usecase';
import { ConfirmationResponse } from '@core/model';

import { TransferConfirmationDto } from '../dto/transfer-confirmation.dto';

@Controller('transfer-confirmation')
@UseInterceptors(ThHttpRequestTracingInterceptor, ThHttpResponseTracingInterceptor)
export class TransferConfirmationController {
  constructor(private readonly confirmationUseCase: ConfirmationUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('transfer').setAction('confirm'),
    tags: ['transfer', 'confirmation', 'webhook']
  })
  handleConfirmation(@Body() notification: TransferConfirmationDto): ConfirmationResponse {
    return this.confirmationUseCase.processConfirmation(notification);
  }
}
