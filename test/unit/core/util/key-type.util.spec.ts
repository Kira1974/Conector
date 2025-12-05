import { KeyType, calculateKeyType } from '@core/util';

describe('KeyType Util', () => {
  describe('calculateKeyType', () => {
    it('should throw error for empty key value', () => {
      expect(() => calculateKeyType('')).toThrow('Key value cannot be empty');
    });

    it('should return COMMERCE_CODE for 10 digits starting with 00', () => {
      const result = calculateKeyType('0012345678');
      expect(result).toBe(KeyType.COMMERCE_CODE);
    });

    it('should return MOVIL for 10 digits starting with 3', () => {
      const result = calculateKeyType('3001234567');
      expect(result).toBe(KeyType.MOVIL);
    });

    it('should return EMAIL for valid email format', () => {
      const result = calculateKeyType('test@example.com');
      expect(result).toBe(KeyType.EMAIL);
    });

    it('should return EMAIL for email with 30 character local part', () => {
      const localPart = 'a'.repeat(30);
      const result = calculateKeyType(`${localPart}@example.com`);
      expect(result).toBe(KeyType.EMAIL);
    });

    it('should return EMAIL for email with 61 character domain part', () => {
      const domainPart = `${'a'.repeat(50)}.com`;
      const result = calculateKeyType(`test@${domainPart}`);
      expect(result).toBe(KeyType.EMAIL);
    });

    it('should return OTHERS for alphanumeric starting with @', () => {
      const result = calculateKeyType('@COLOMBIA');
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should return OTHERS for 6 characters starting with @', () => {
      const result = calculateKeyType('@TEST1');
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should return OTHERS for 21 characters starting with @', () => {
      const result = calculateKeyType(`@${'A'.repeat(20)}`);
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should return NRIC for 1 character', () => {
      const result = calculateKeyType('1');
      expect(result).toBe(KeyType.NRIC);
    });

    it('should return NRIC for 18 characters', () => {
      const result = calculateKeyType('123456789012345678');
      expect(result).toBe(KeyType.NRIC);
    });

    it('should return OTHERS for values not matching any pattern', () => {
      const result = calculateKeyType('1234567890123456789');
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should prioritize COMMERCE_CODE over MOVIL for 00 prefix', () => {
      const result = calculateKeyType('0000000003');
      expect(result).toBe(KeyType.COMMERCE_CODE);
    });

    it('should not return EMAIL for @ at the start', () => {
      const result = calculateKeyType('@test@example.com');
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should not return EMAIL for email longer than 92 chars', () => {
      const longEmail = `${'a'.repeat(50)}@${'b'.repeat(50)}.com`;
      const result = calculateKeyType(longEmail);
      expect(result).toBe(KeyType.OTHERS);
    });

    it('should not return MOVIL for non-numeric 10 chars starting with 3', () => {
      const result = calculateKeyType('3abc123456');
      expect(result).toBe(KeyType.NRIC);
    });
  });
});
