import { Controller, Post, Body, HttpCode, HttpStatus, HttpException, UseInterceptors } from '@nestjs/common';
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

import { AccountQueryUseCase, AccountQueryResponseDto } from '@core/usecase/account-query.usecase';
import { obfuscateKey } from '@core/util';

import { AccountQueryRequestDto, AccountQuerySuccessDataDto } from '../dto';

import { ApiAccountQueryDocs } from './decorators/api-account-query-docs.decorator';

@ApiTags('Account Query')
@Controller('account/query')
@UseInterceptors(ThHttpRequestTracingInterceptor, ThHttpResponseTracingInterceptor)
export class AccountQueryController {
  private readonly logger: ThLogger;

  constructor(
    private readonly accountQueryUseCase: AccountQueryUseCase,
    private readonly loggerService: ThLoggerService
  ) {
    this.logger = this.loggerService.getLogger(AccountQueryController.name, ThLoggerComponent.CONTROLLER);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiAccountQueryDocs()
  @ThTraceEvent({
    eventType: new ThEventTypeBuilder().setDomain('account-query').setAction('post'),
    tags: ['account-query', 'breb', 'dife']
  })
  async queryAccount(@Body() request: AccountQueryRequestDto): Promise<AccountQueryResponseDto> {
    const keyValue = request.account.value;

    this.logger.log('CHARON_REQUEST', {
      accountType: request.account.type,
      key: obfuscateKey(keyValue, 3)
    });

    const result = await this.accountQueryUseCase.execute(keyValue);
    const { response, correlationId, difeExecutionId, httpStatus } = result;

    const successData = response.data as AccountQuerySuccessDataDto;

    this.logger.log('CHARON_RESPONSE', {
      status: httpStatus,
      correlationId,
      externalTransactionId: difeExecutionId,
      responseCode: 'state' in response.data ? successData.state : response.code,
      responseBody: response
    });

    if (httpStatus !== (HttpStatus.CREATED as number)) {
      throw new HttpException(response, httpStatus);
    }

    return response;
  }
}
