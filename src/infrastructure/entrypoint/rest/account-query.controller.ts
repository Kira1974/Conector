import { Controller, Post, Body, Res, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  ThLogger,
  ThLoggerService,
  ThLoggerComponent,
  ThTraceEvent,
  ThEventTypeBuilder,
  ThHttpRequestTracingInterceptor,
  ThHttpResponseTracingInterceptor
} from 'themis';

import { AccountQueryUseCase } from '@core/usecase';
import { calculateKeyType, obfuscateKey } from '@core/util';

import { AccountQueryRequestDto } from '../dto';

import { ApiAccountQueryDocs } from './decorators/api-account-query-docs.decorator';
import { HttpStatusMapper } from './util/http-status.mapper';

@ApiTags('Account Query')
@Controller('account')
@UseInterceptors(ThHttpRequestTracingInterceptor, ThHttpResponseTracingInterceptor)
export class AccountQueryController {
  private readonly logger: ThLogger;

  constructor(
    private readonly accountQueryUseCase: AccountQueryUseCase,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(AccountQueryController.name, ThLoggerComponent.CONTROLLER);
  }

  @Post('query')
  @ApiAccountQueryDocs()
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('account-query').setAction('post'),
    tags: ['account-query', 'dife', 'breb']
  })
  async queryAccount(@Body() request: AccountQueryRequestDto, @Res() res: Response): Promise<Response> {
    const { account } = request;
    this.logger.log('CHARON_REQUEST', {
      accountType: account.type,
      keyType: calculateKeyType(account.value),
      key: obfuscateKey(account.value, 3)
    });

    const result = await this.accountQueryUseCase.execute(account.value);
    const { response } = result;

    const httpStatus = HttpStatusMapper.mapThAppStatusCodeToHttpStatus(response.code);
    const finalResponse = { ...response, code: httpStatus };

    this.logger.log('CHARON_RESPONSE', {
      status: httpStatus,
      externalTransactionId: response.data?.externalTransactionId,
      responseBody: finalResponse
    });

    return res.status(httpStatus).json(finalResponse);
  }
}
