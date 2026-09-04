/**
 * CPF validation (11 digits, check digits algorithm).
 */
export function validateCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Reject all-same-digit sequences
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Number(digits[i]) * (len + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 || remainder === 11 ? 0 : remainder;
  };

  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

/**
 * CNPJ validation (14 digits, check digits algorithm).
 */
export function validateCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (len: number) => {
    const weights =
      len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += Number(digits[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

/**
 * Validates CPF or CNPJ based on document type.
 */
export function validateDocument(type: 'cpf' | 'cnpj', number: string): boolean {
  if (type === 'cpf') return validateCpf(number);
  if (type === 'cnpj') return validateCnpj(number);
  return false;
}
