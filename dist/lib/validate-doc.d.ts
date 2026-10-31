/**
 * CPF validation (11 digits, check digits algorithm).
 */
export declare function validateCpf(value: string): boolean;
/**
 * CNPJ validation (14 digits, check digits algorithm).
 */
export declare function validateCnpj(value: string): boolean;
/**
 * Validates CPF or CNPJ based on document type.
 */
export declare function validateDocument(type: 'cpf' | 'cnpj', number: string): boolean;
//# sourceMappingURL=validate-doc.d.ts.map