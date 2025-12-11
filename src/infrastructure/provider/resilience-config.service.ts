import { Injectable } from '@nestjs/common';

import { ExternalServicesConfigService } from '@config/external-services-config.service';

/**
 * Resilience Configuration Service
 * Provides timeout configuration from JSON config files
 */
@Injectable()
export class ResilienceConfigService {
  constructor(private externalServicesConfig: ExternalServicesConfigService) {}

  /**
   * Get DIFE service timeout
   */
  getDifeTimeout(): number {
    return this.externalServicesConfig.getDifeTimeout();
  }

  /**
   * Get MOL payment service timeout
   */
  getMolTimeout(): number {
    return this.externalServicesConfig.getMolTimeout();
  }

  /**
   * Get OAuth service timeout
   */
  getOAuthTimeout(): number {
    return this.externalServicesConfig.getOAuthTimeout();
  }

  /**
   * Get OAuth cache TTL in seconds
   */
  getOAuthCacheTtl(): number {
    return this.externalServicesConfig.getOAuthCacheTtl();
  }
}
