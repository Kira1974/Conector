import { KeyType, calculateKeyType } from '@core/util';

describe('KeyType Util', () => {
  describe('calculateKeyType', () => {
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

    it('should return NRIC for alphanumeric less than 18 characters', () => {
      const result = calculateKeyType('ABC123');
      expect(result).toBe(KeyType.NRIC);
    });

    it('should return OTHERS as default for keys not matching other patterns', () => {
      const result = calculateKeyType('INVALIDKEY12345678901234567890');
      expect(result).toBe(KeyType.OTHERS);
    });
  });
});
