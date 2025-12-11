import { Injectable } from '@nestjs/common';

import { GenericConfigService } from './generic-config.service';

export interface MolPayerConfiguration {
  identificationType: string;
  identificationValue: string;
  name: string;
  paymentMethodType: string;
  paymentMethodValue: string;
  paymentMethodCurrency: string;
}

@Injectable()
export class MolPayerConfigService {
  constructor(private config: GenericConfigService) {}

  getPayerConfiguration(): MolPayerConfiguration {
    const identificationType = this.config.get<string>('molPayer.identificationType');
    const identificationValue = this.config.get<string>('molPayer.identificationValue');
    const name = this.config.get<string>('molPayer.name');
    const paymentMethodType = this.config.get<string>('molPayer.paymentMethodType');
    const paymentMethodValue = this.config.get<string>('molPayer.paymentMethodValue');
    const paymentMethodCurrency = this.config.get<string>('molPayer.paymentMethodCurrency');

    if (
      !identificationType ||
      !identificationValue ||
      !name ||
      !paymentMethodType ||
      !paymentMethodValue ||
      !paymentMethodCurrency
    ) {
      throw new Error('MOL payer configuration is not fully configured');
    }

    return {
      identificationType,
      identificationValue,
      name,
      paymentMethodType,
      paymentMethodValue,
      paymentMethodCurrency
    };
  }
}
