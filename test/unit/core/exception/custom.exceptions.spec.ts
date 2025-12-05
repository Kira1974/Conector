import { HttpStatus } from '@nestjs/common';

import {
  TimeoutException,
  ExternalServiceException,
  ValidationException,
  KeyResolutionException,
  PaymentProcessingException
} from '@core/exception/custom.exceptions';

describe('Custom Exceptions', () => {
  describe('TimeoutException', () => {
    it('should create timeout exception with all parameters', () => {
      const exception = new TimeoutException('MOL', 5000, 'corr-123');

      expect(exception.message).toBe('Service MOL timed out after 5000ms');
      expect(exception.errorCode).toBe('TIMEOUT_ERROR');
      expect(exception.correlationId).toBe('corr-123');
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
    });

    it('should create timeout exception without correlation ID', () => {
      const exception = new TimeoutException('DIFE', 3000);

      expect(exception.message).toBe('Service DIFE timed out after 3000ms');
      expect(exception.errorCode).toBe('TIMEOUT_ERROR');
      expect(exception.correlationId).toBeUndefined();
      expect(exception.getStatus()).toBe(HttpStatus.REQUEST_TIMEOUT);
    });
  });

  describe('ExternalServiceException', () => {
    it('should create external service exception with all parameters', () => {
      const exception = new ExternalServiceException('MOL', 'Connection failed', 'CONN_ERROR', 'corr-456');

      expect(exception.message).toBe('External service error in MOL: Connection failed');
      expect(exception.errorCode).toBe('CONN_ERROR');
      expect(exception.serviceName).toBe('MOL');
      expect(exception.correlationId).toBe('corr-456');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    });

    it('should create external service exception with default error code', () => {
      const exception = new ExternalServiceException('DIFE', 'Timeout', undefined, 'corr-789');

      expect(exception.message).toBe('External service error in DIFE: Timeout');
      expect(exception.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.serviceName).toBe('DIFE');
      expect(exception.correlationId).toBe('corr-789');
    });

    it('should create external service exception without correlation ID', () => {
      const exception = new ExternalServiceException('AUTH', 'Invalid token');

      expect(exception.message).toBe('External service error in AUTH: Invalid token');
      expect(exception.errorCode).toBe('EXTERNAL_SERVICE_ERROR');
      expect(exception.serviceName).toBe('AUTH');
      expect(exception.correlationId).toBeUndefined();
    });
  });

  describe('ValidationException', () => {
    it('should create validation exception with field and correlation ID', () => {
      const exception = new ValidationException('Invalid amount', 'amount', 'corr-111');

      expect(exception.message).toBe('Invalid amount');
      expect(exception.errorCode).toBe('VALIDATION_ERROR');
      expect(exception.field).toBe('amount');
      expect(exception.correlationId).toBe('corr-111');
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it('should create validation exception without field', () => {
      const exception = new ValidationException('Invalid request', undefined, 'corr-222');

      expect(exception.message).toBe('Invalid request');
      expect(exception.field).toBeUndefined();
      expect(exception.correlationId).toBe('corr-222');
    });

    it('should create validation exception without correlation ID', () => {
      const exception = new ValidationException('Invalid format', 'key');

      expect(exception.message).toBe('Invalid format');
      expect(exception.field).toBe('key');
      expect(exception.correlationId).toBeUndefined();
    });
  });

  describe('KeyResolutionException', () => {
    it('should create key resolution exception with correlation ID', () => {
      const exception = new KeyResolutionException('3001234567', 'Key not found', 'corr-333');

      expect(exception.message).toBe('Key resolution failed for key 3001234567: Key not found');
      expect(exception.errorCode).toBe('KEY_RESOLUTION_ERROR');
      expect(exception.correlationId).toBe('corr-333');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should create key resolution exception without correlation ID', () => {
      const exception = new KeyResolutionException('invalid@email', 'Invalid format');

      expect(exception.message).toBe('Key resolution failed for key invalid@email: Invalid format');
      expect(exception.errorCode).toBe('KEY_RESOLUTION_ERROR');
      expect(exception.correlationId).toBeUndefined();
    });
  });

  describe('PaymentProcessingException', () => {
    it('should create payment processing exception with correlation ID', () => {
      const exception = new PaymentProcessingException('Insufficient funds', 'corr-444');

      expect(exception.message).toBe('Payment processing failed: Insufficient funds');
      expect(exception.errorCode).toBe('PAYMENT_PROCESSING_ERROR');
      expect(exception.correlationId).toBe('corr-444');
      expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    });

    it('should create payment processing exception without correlation ID', () => {
      const exception = new PaymentProcessingException('Account blocked');

      expect(exception.message).toBe('Payment processing failed: Account blocked');
      expect(exception.errorCode).toBe('PAYMENT_PROCESSING_ERROR');
      expect(exception.correlationId).toBeUndefined();
    });
  });
});
