import { HttpStatus } from '@nestjs/common';

import { HttpStatusMapper } from '@infrastructure/entrypoint/rest/util/http-status.mapper';
import { TransferResponseCode } from '@infrastructure/entrypoint/dto';

describe('HttpStatusMapper', () => {
  describe('mapResponseCodeToHttpStatus', () => {
    it('should map APPROVED to HTTP 200', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus(TransferResponseCode.APPROVED);
      expect(result).toBe(HttpStatus.OK);
      expect(result).toBe(200);
    });

    it('should map PENDING to HTTP 200', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus(TransferResponseCode.PENDING);
      expect(result).toBe(HttpStatus.OK);
      expect(result).toBe(200);
    });

    it('should map VALIDATION_FAILED to HTTP 400', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus(TransferResponseCode.VALIDATION_FAILED);
      expect(result).toBe(HttpStatus.BAD_REQUEST);
      expect(result).toBe(400);
    });

    it('should map REJECTED_BY_PROVIDER to HTTP 422', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus(TransferResponseCode.REJECTED_BY_PROVIDER);
      expect(result).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(result).toBe(422);
    });

    it('should map ERROR to HTTP 500', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus(TransferResponseCode.ERROR);
      expect(result).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result).toBe(500);
    });

    it('should return HTTP 500 for unknown response codes', () => {
      const result = HttpStatusMapper.mapResponseCodeToHttpStatus('UNKNOWN' as TransferResponseCode);
      expect(result).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(result).toBe(500);
    });
  });
});
