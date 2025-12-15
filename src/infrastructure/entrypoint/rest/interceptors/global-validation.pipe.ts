import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const errors = GlobalValidationPipe.formatValidationErrors(validationErrors);
        return new BadRequestException({
          message: 'Validation failed',
          errors,
          statusCode: 400
        });
      }
    });
  }

  private static formatValidationErrors(validationErrors: ValidationError[]): {
    field: string;
    value: unknown;
    constraints: string[];
    children?: {
      field: string;
      value: unknown;
      constraints: string[];
      children?: unknown;
    }[];
  }[] {
    return validationErrors.map((error) => ({
      field: error.property,
      value: error.value as unknown,
      constraints: error.constraints ? Object.values(error.constraints) : [],
      children:
        error.children && error.children.length > 0
          ? GlobalValidationPipe.formatValidationErrors(error.children)
          : undefined
    }));
  }
}
