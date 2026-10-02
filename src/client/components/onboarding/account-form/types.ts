import type { FormikProps } from 'formik';

export type AccountFormValues = {
  fullName: string;
  displayName: string;
  phone: string;
  email: string;
  documentType: 'cpf' | 'cnpj';
  documentNumber: string;
  birthDate: string;
  zipCode: string;
  state: string;
  city: string;
  /** IBGE municipality code for `city` (7 digits). Empty when the row predates the picker's
   *  id capture or the user typed a city the picker didn't resolve. */
  cityIbge: string;
  bio: string;
  avatarUrl: string;
};

export type AccountFormik = FormikProps<AccountFormValues>;

/** Erro de um campo só depois de tocado ou de uma tentativa de salvar. */
export function fieldError(formik: AccountFormik, name: keyof AccountFormValues) {
  const shown = formik.touched[name] || formik.submitCount > 0;
  const error = formik.errors[name];
  return shown && typeof error === 'string' ? error : undefined;
}
