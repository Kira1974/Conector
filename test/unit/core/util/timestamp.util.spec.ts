import { formatTimestampWithoutZ, generateCorrelationId } from '@core/util/timestamp.util';

describe('Timestamp Util', () => {
  describe('formatTimestampWithoutZ', () => {
    it('should return timestamp without Z suffix', () => {
      const timestamp = formatTimestampWithoutZ();

      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/);
      expect(timestamp).not.toContain('Z');
    });

    it('should match ISO 8601 format without Z', () => {
      const timestamp = formatTimestampWithoutZ();
      const regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/;

      expect(regex.test(timestamp)).toBe(true);
    });

    it('should have milliseconds precision', () => {
      const timestamp = formatTimestampWithoutZ();
      const parts = timestamp.split('.');

      expect(parts).toHaveLength(2);
      expect(parts[1]).toHaveLength(3);
    });

    it('should generate different timestamps on consecutive calls', async () => {
      const timestamp1 = formatTimestampWithoutZ();
      await new Promise((resolve) => setTimeout(resolve, 5));
      const timestamp2 = formatTimestampWithoutZ();

      expect(timestamp1).not.toBe(timestamp2);
    });

    it('should be in format YYYY-MM-DDThh:mm:SS.sss', () => {
      const timestamp = formatTimestampWithoutZ();
      const date = new Date();
      const year = date.getFullYear();

      expect(timestamp).toContain(year.toString());
      expect(timestamp).toContain('T');
      expect(timestamp.split('T')).toHaveLength(2);
    });
  });

  describe('generateCorrelationId', () => {
    it('should generate 15-digit correlation ID', () => {
      const correlationId = generateCorrelationId();

      expect(correlationId).toHaveLength(15);
      expect(correlationId).toMatch(/^\d{15}$/);
    });

    it('should pad with leading zeros if timestamp is less than 15 digits', () => {
      const correlationId = generateCorrelationId();

      expect(correlationId).toHaveLength(15);
      expect(Number.isInteger(Number(correlationId))).toBe(true);
    });

    it('should be based on current timestamp', () => {
      const before = Date.now();
      const correlationId = generateCorrelationId();
      const after = Date.now();

      const correlationIdNumber = Number(correlationId);
      expect(correlationIdNumber).toBeGreaterThanOrEqual(before);
      expect(correlationIdNumber).toBeLessThanOrEqual(after);
    });

    it('should generate unique IDs on consecutive calls', async () => {
      const id1 = generateCorrelationId();
      await new Promise((resolve) => setTimeout(resolve, 2));
      const id2 = generateCorrelationId();

      expect(id1).not.toBe(id2);
    });
  });
});
