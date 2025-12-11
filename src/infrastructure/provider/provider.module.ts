import { Module } from '@nestjs/common';

import { IDifeProvider, IMolPaymentProvider } from '@core/provider';

import { ResilienceConfigService } from './resilience-config.service';
import { HttpClientService } from './http-clients/http-client.service';
import { AuthService } from './http-clients/auth.service';
import { DifeProvider, MolPaymentProvider } from './http-clients';

/**
 * Provider Module - Output adapters
 * Contains services that interact with the outside world
 */
@Module({
  providers: [
    ResilienceConfigService,
    HttpClientService,
    AuthService,
    {
      provide: IDifeProvider,
      useClass: DifeProvider
    },
    {
      provide: IMolPaymentProvider,
      useClass: MolPaymentProvider
    }
  ],
  exports: [ResilienceConfigService, HttpClientService, AuthService, IDifeProvider, IMolPaymentProvider]
})
export class ProviderModule {}
