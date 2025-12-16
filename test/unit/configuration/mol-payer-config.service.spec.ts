import { Test, TestingModule } from '@nestjs/testing';

import { MolPayerConfigService, MolPayerConfiguration } from '@config/mol-payer-config.service';
import { GenericConfigService } from '@config/generic-config.service';

describe('MolPayerConfigService', () => {
  let service: MolPayerConfigService;
  let genericConfig: jest.Mocked<GenericConfigService>;

  beforeEach(async () => {
    const mockGenericConfig = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MolPayerConfigService,
        {
          provide: GenericConfigService,
          useValue: mockGenericConfig
        }
      ]
    }).compile();

    service = module.get<MolPayerConfigService>(MolPayerConfigService);
    genericConfig = module.get<GenericConfigService>(GenericConfigService) as jest.Mocked<GenericConfigService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPayerConfiguration', () => {
    it('should return payer configuration when all fields are set', () => {
      const expectedConfig: MolPayerConfiguration = {
        identificationType: 'NIT',
        identificationValue: '123456789',
        name: 'Test Payer',
        paymentMethodType: 'CAHO',
        paymentMethodValue: '1234567890',
        paymentMethodCurrency: 'COP'
      };

      genericConfig.get
        .mockReturnValueOnce(expectedConfig.identificationType)
        .mockReturnValueOnce(expectedConfig.identificationValue)
        .mockReturnValueOnce(expectedConfig.name)
        .mockReturnValueOnce(expectedConfig.paymentMethodType)
        .mockReturnValueOnce(expectedConfig.paymentMethodValue)
        .mockReturnValueOnce(expectedConfig.paymentMethodCurrency);

      const result = service.getPayerConfiguration();

      expect(result).toEqual(expectedConfig);
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.identificationType');
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.identificationValue');
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.name');
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.paymentMethodType');
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.paymentMethodValue');
      expect(genericConfig.get).toHaveBeenCalledWith('molPayer.paymentMethodCurrency');
    });

    it('should throw error when identificationType is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('')
        .mockReturnValueOnce('123456789')
        .mockReturnValueOnce('Test Payer')
        .mockReturnValueOnce('CAHO')
        .mockReturnValueOnce('1234567890')
        .mockReturnValueOnce('COP');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });

    it('should throw error when identificationValue is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('NIT')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('Test Payer')
        .mockReturnValueOnce('CAHO')
        .mockReturnValueOnce('1234567890')
        .mockReturnValueOnce('COP');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });

    it('should throw error when name is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('NIT')
        .mockReturnValueOnce('123456789')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('CAHO')
        .mockReturnValueOnce('1234567890')
        .mockReturnValueOnce('COP');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });

    it('should throw error when paymentMethodType is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('NIT')
        .mockReturnValueOnce('123456789')
        .mockReturnValueOnce('Test Payer')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('1234567890')
        .mockReturnValueOnce('COP');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });

    it('should throw error when paymentMethodValue is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('NIT')
        .mockReturnValueOnce('123456789')
        .mockReturnValueOnce('Test Payer')
        .mockReturnValueOnce('CAHO')
        .mockReturnValueOnce('')
        .mockReturnValueOnce('COP');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });

    it('should throw error when paymentMethodCurrency is missing', () => {
      genericConfig.get
        .mockReturnValueOnce('NIT')
        .mockReturnValueOnce('123456789')
        .mockReturnValueOnce('Test Payer')
        .mockReturnValueOnce('CAHO')
        .mockReturnValueOnce('1234567890')
        .mockReturnValueOnce('');

      expect(() => service.getPayerConfiguration()).toThrow('MOL payer configuration is not fully configured');
    });
  });
});
