import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resilience Configuration Service
 * Provides timeout configuration from environment variables
 */
@Injectable()
export class ResilienceConfigService {
  constructor(private configService: ConfigService) {}

  private getRequiredTimeout(variableName: string): string {
    const value = this.configService.get<string>(variableName);
    if (!value) {
      throw new Error(`${variableName} is not configured`);
    }
    return value;
  }

  /**
   * Get DIFE service timeout
   */
  getDifeTimeout(): number {
    return parseInt(this.getRequiredTimeout('DIFE_TIMEOUT_MS'), 10);
  }

  /**
   * Get MOL payment service timeout
   */
  getMolTimeout(): number {
    return parseInt(this.getRequiredTimeout('MOL_TIMEOUT_MS'), 10);
  }

  /**
   * Get OAuth service timeout
   */
  getOAuthTimeout(): number {
    return parseInt(this.getRequiredTimeout('OAUTH_TIMEOUT_MS'), 10);
  }
}
