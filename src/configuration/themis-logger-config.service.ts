import { Injectable } from '@nestjs/common';
import { ThLogLevel } from 'themis';

import { GenericConfigService } from './generic-config.service';

export interface ThemisLoggerConfig {
  environment: string;
  service: string;
  version: string;
  minimumLevel: ThLogLevel;
  format: {
    pretty: boolean;
    colors: boolean;
  };
}

@Injectable()
export class ThemisLoggerConfigService {
  constructor(private config: GenericConfigService) {}

  getLoggerConfig(): ThemisLoggerConfig {
    const isPrettyEnabled = this.config.get<boolean>('logging.pretty');
    const areColorsEnabled = this.config.get<boolean>('logging.colors');
    const minLevelStr = this.config.get<string>('logging.minLevel');
    const minLevel = this.mapStringToLogLevel(minLevelStr);

    return {
      environment: this.config.get<string>('logging.environment'),
      service: this.config.get<string>('logging.service'),
      version: this.config.get<string>('logging.version'),
      minimumLevel: minLevel,
      format: {
        pretty: isPrettyEnabled,
        colors: areColorsEnabled
      }
    };
  }

  private mapStringToLogLevel(level: string): ThLogLevel {
    const levelMap: Record<string, ThLogLevel> = {
      DEBUG: ThLogLevel.DEBUG,
      INFO: ThLogLevel.INFO,
      WARN: ThLogLevel.WARN,
      ERROR: ThLogLevel.ERROR
    };
    const mapped = levelMap[level.toUpperCase()];
    if (!mapped) {
      throw new Error(`Invalid log level: ${level}. Must be one of: DEBUG, INFO, WARN, ERROR`);
    }
    return mapped;
  }
}
