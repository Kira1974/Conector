import { Controller, Get } from '@nestjs/common';

/**
 * Health Controller
 * Simple endpoint to verify that the service is up and running
 */
@Controller('health')
export class HealthController {
  @Get()
  checkHealth(): { status: string } {
    return { status: 'UP' };
  }
}
