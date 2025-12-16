import { KeyType } from '@core/util';
import { validateKeyFormat } from '@core/util/key-format-validator.util';

describe('validateKeyFormat', () => {
  describe('empty key value', () => {
    it('should return invalid for empty string', () => {
      const result = validateKeyFormat('', KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Key value cannot be empty');
    });
  });

  describe('OTHERS key type', () => {
    it('should return valid for valid alphanumeric identifier', () => {
      const result = validateKeyFormat('@COLOMBIA', KeyType.OTHERS);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when length is less than 6', () => {
      const result = validateKeyFormat('@TEST', KeyType.OTHERS);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        'Key value must be between 6 and 21 characters for alphanumeric identifier type'
      );
    });

    it('should return invalid when length is greater than 21', () => {
      const result = validateKeyFormat('@' + 'A'.repeat(21), KeyType.OTHERS);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe(
        'Key value must be between 6 and 21 characters for alphanumeric identifier type'
      );
    });

    it('should return invalid when not starting with @', () => {
      const result = validateKeyFormat('COLOMBIA', KeyType.OTHERS);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Alphanumeric identifier key must start with @');
    });

    it('should return invalid when contains lowercase letters', () => {
      const result = validateKeyFormat('@colombia', KeyType.OTHERS);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Key value must contain only uppercase letters, numbers, and @ symbol');
    });

    it('should return invalid when contains special characters', () => {
      const result = validateKeyFormat('@COLOMBIA-123', KeyType.OTHERS);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Key value must contain only uppercase letters, numbers, and @ symbol');
    });

    it('should return valid for minimum length (6)', () => {
      const result = validateKeyFormat('@TEST1', KeyType.OTHERS);
      expect(result.isValid).toBe(true);
    });

    it('should return valid for maximum length (21)', () => {
      const result = validateKeyFormat('@' + 'A'.repeat(20), KeyType.OTHERS);
      expect(result.isValid).toBe(true);
    });

    it('should return valid for numeric values', () => {
      const result = validateKeyFormat('@123456', KeyType.OTHERS);
      expect(result.isValid).toBe(true);
    });
  });

  describe('MOVIL key type', () => {
    it('should return valid for valid mobile number', () => {
      const result = validateKeyFormat('3001234567', KeyType.MOVIL);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when length is not 10', () => {
      const result = validateKeyFormat('300123456', KeyType.MOVIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Mobile number key must be 10 digits starting with 3');
    });

    it('should return invalid when not starting with 3', () => {
      const result = validateKeyFormat('4001234567', KeyType.MOVIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Mobile number key must be 10 digits starting with 3');
    });

    it('should return invalid when contains non-numeric characters', () => {
      const result = validateKeyFormat('30012345a7', KeyType.MOVIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Mobile number key must be 10 digits starting with 3');
    });
  });

  describe('EMAIL key type', () => {
    it('should return valid for valid email', () => {
      const result = validateKeyFormat('test@example.com', KeyType.EMAIL);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when does not contain @', () => {
      const result = validateKeyFormat('testexample.com', KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key must contain @ symbol and not start with @');
    });

    it('should return invalid when starts with @', () => {
      const result = validateKeyFormat('@example.com', KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key must contain @ symbol and not start with @');
    });

    it('should return invalid when local part is too long', () => {
      const longLocalPart = 'a'.repeat(31);
      const result = validateKeyFormat(`${longLocalPart}@example.com`, KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key format is invalid');
    });

    it('should return invalid when domain part is too long', () => {
      const longDomain = 'a'.repeat(62) + '.com';
      const result = validateKeyFormat(`test@${longDomain}`, KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key format is invalid');
    });

    it('should return invalid when total length is less than 3', () => {
      const result = validateKeyFormat('a@', KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key format is invalid');
    });

    it('should return invalid when total length is greater than 92', () => {
      const longEmail = `${'a'.repeat(30)}@${'b'.repeat(63)}.com`;
      const result = validateKeyFormat(longEmail, KeyType.EMAIL);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Email key format is invalid');
    });

    it('should return valid for maximum local part length (30)', () => {
      const localPart = 'a'.repeat(30);
      const result = validateKeyFormat(`${localPart}@example.com`, KeyType.EMAIL);
      expect(result.isValid).toBe(true);
    });

    it('should return valid for maximum domain part length (61)', () => {
      const domainPart = 'a'.repeat(50) + '.com';
      const result = validateKeyFormat(`test@${domainPart}`, KeyType.EMAIL);
      expect(result.isValid).toBe(true);
    });
  });

  describe('COMMERCE_CODE key type', () => {
    it('should return valid for valid commerce code', () => {
      const result = validateKeyFormat('0012345678', KeyType.COMMERCE_CODE);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when length is not 10', () => {
      const result = validateKeyFormat('001234567', KeyType.COMMERCE_CODE);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Commerce code key must be 10 digits starting with 00');
    });

    it('should return invalid when not starting with 00', () => {
      const result = validateKeyFormat('1012345678', KeyType.COMMERCE_CODE);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Commerce code key must be 10 digits starting with 00');
    });
  });

  describe('NRIC key type', () => {
    it('should return valid for valid identification number', () => {
      const result = validateKeyFormat('1234567890', KeyType.NRIC);
      expect(result.isValid).toBe(true);
    });

    it('should return valid for minimum length (1)', () => {
      const result = validateKeyFormat('1', KeyType.NRIC);
      expect(result.isValid).toBe(true);
    });

    it('should return valid for maximum length (18)', () => {
      const result = validateKeyFormat('1'.repeat(18), KeyType.NRIC);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when length is less than 1', () => {
      const result = validateKeyFormat('', KeyType.NRIC);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Key value cannot be empty');
    });

    it('should return invalid when length is greater than 18', () => {
      const result = validateKeyFormat('1'.repeat(19), KeyType.NRIC);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Identification number key must be between 1 and 18 characters');
    });

    it('should return invalid when contains lowercase letters', () => {
      const result = validateKeyFormat('123456789a', KeyType.NRIC);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Identification number key must contain only uppercase letters and numbers');
    });

    it('should return valid for uppercase letters', () => {
      const result = validateKeyFormat('ABC123456', KeyType.NRIC);
      expect(result.isValid).toBe(true);
    });

    it('should return invalid when contains special characters', () => {
      const result = validateKeyFormat('123456789-0', KeyType.NRIC);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Identification number key must contain only uppercase letters and numbers');
    });
  });
});
