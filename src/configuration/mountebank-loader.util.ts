import * as fs from 'fs';
import * as path from 'path';

import { DynamicModule } from '@nestjs/common';

export function isMountebankEnabled(): boolean {
  try {
    const env = process.env.ENV;
    if (!env) {
      throw new Error('Environment variable ENV is required but not set');
    }
    const configPath = path.join(process.cwd(), 'deployment', env, 'app.json');
    if (!fs.existsSync(configPath)) {
      return false;
    }
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as { mountebank?: { enabled?: boolean } };
    return config.mountebank?.enabled === true;
  } catch {
    return false;
  }
}

export function loadMountebankModule(): DynamicModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mountebankModule = require('./setup/mountebank.module') as {
    MountebankModule: { forRoot: () => DynamicModule };
  };
  return mountebankModule.MountebankModule.forRoot();
}
