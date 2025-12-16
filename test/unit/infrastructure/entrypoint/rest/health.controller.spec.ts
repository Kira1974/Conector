import { Test, TestingModule } from '@nestjs/testing';

import { HealthController } from '@infrastructure/entrypoint/rest/health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController]
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should return status UP', () => {
      const result = controller.checkHealth();

      expect(result).toEqual({ status: 'UP' });
    });
  });
});
