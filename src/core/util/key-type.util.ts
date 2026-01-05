export enum KeyType {
  NRIC = 'NRIC', // Número de identificación
  MOVIL = 'M', // Celular
  EMAIL = 'E', // Correo electrónico
  OTHERS = 'O', // Alfanumérico
  COMMERCE_CODE = 'B' // Código de comercio
}

export function calculateKeyType(keyValue: string): KeyType {
  const length = keyValue.length;
  const isNumeric = /^\d+$/.test(keyValue);

  if (length === 10 && keyValue.startsWith('00') && isNumeric) {
    return KeyType.COMMERCE_CODE;
  }

  if (length === 10 && isNumeric && keyValue.startsWith('3')) {
    return KeyType.MOVIL;
  }

  if (keyValue.includes('@') && !keyValue.startsWith('@')) {
    const [localPart, domainPart] = keyValue.split('@');
    if (localPart && localPart.length <= 30 && domainPart && domainPart.length <= 61 && length >= 3 && length <= 92) {
      return KeyType.EMAIL;
    }
  }

  if (keyValue.startsWith('@') && length >= 6 && length <= 21) {
    return KeyType.OTHERS;
  }

  if (length >= 1 && length <= 18) {
    return KeyType.NRIC;
  }

  return KeyType.OTHERS;
}
