import { DynamicModule, Module } from '@nestjs/common';

import { ConfigurationModule } from '../configuration.module';

import { MountebankService } from './mountebank.service';

@Module({})
export class MountebankModule {
  static forRoot(): DynamicModule {
    return {
      module: MountebankModule,
      imports: [ConfigurationModule],
      providers: [MountebankService],
      exports: [MountebankService]
    };
  }
}
