import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Generic configuration service that provides easy access to any configuration value
 * from the JSON config files without requiring new service files or mappings.
 *
 * Usage:
 * ```typescript
 * constructor(private config: GenericConfigService) {}
 *
 * // Get any value from JSON (fails if not found)
 * const port = this.config.get<number>('app.port');
 * const timeout = this.config.get<number>('transfer.timeoutMs');
 *
 * // Check if value exists before accessing
 * if (this.config.has('feature.enabled')) {
 *   const enabled = this.config.get<boolean>('feature.enabled');
 * }
 * ```
 */
@Injectable()
export class GenericConfigService {
  constructor(private configService: ConfigService) {}

  /**
   * Get a configuration value by path (dot notation)
   * Throws error if the value is not found
   * @param path - Configuration path using dot notation (e.g., 'app.port', 'transfer.timeoutMs')
   * @returns The configuration value
   * @throws Error if the value is not found
   */
  get<T = any>(path: string): T {
    const value = this.configService.get<T>(path);
    if (value === undefined || value === null) {
      throw new Error(`Required configuration '${path}' is not set`);
    }
    return value;
  }

  /**
   * Get a required configuration value (throws error if not found)
   * Alias for get() for clarity
   * @param path - Configuration path using dot notation
   * @returns The configuration value
   * @throws Error if the value is not found
   */
  getRequired<T = any>(path: string): T {
    return this.get<T>(path);
  }

  /**
   * Check if a configuration value exists
   * @param path - Configuration path using dot notation
   * @returns True if the value exists
   */
  has(path: string): boolean {
    return this.configService.get(path) !== undefined;
  }
}
