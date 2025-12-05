import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';

import { ConfirmationUseCase } from '@core/usecase/confirmation.usecase';
import { ConfirmationResponse } from '@core/model';

import { TransferConfirmationDto } from '../dto/transfer-confirmation.dto';

@Controller('transfer-confirmation')
export class TransferConfirmationController {
  constructor(private readonly confirmationUseCase: ConfirmationUseCase) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleConfirmation(@Body() notification: TransferConfirmationDto): ConfirmationResponse {
    return this.confirmationUseCase.processConfirmation(notification);
  }
}
