'use client';

import { Loader2 } from 'lucide-react';
import { Input } from '../../ui/input';
import { SearchableSelect } from '../../ui/searchable-select';
import { Field, SectionCard } from './section-card';
import { fieldError, type AccountFormik } from './types';

const STATES_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
].map((uf) => ({ value: uf, label: uf }));

type Props = {
  formik: AccountFormik;
  cepLoading: boolean;
  cityOptions: { value: string; label: string }[];
  cityOptionsLoading: boolean;
};

export function AddressSection({ formik, cepLoading, cityOptions, cityOptionsLoading }: Props) {
  const hasState = Boolean(formik.values.state);

  return (
    <SectionCard title="Endereço" description="Comece pelo CEP que a gente preenche o resto.">
      <div className="max-w-[12rem]">
        <Field label="CEP" htmlFor="zipCode" error={fieldError(formik, 'zipCode')}>
          <div className="relative">
            <Input
              id="zipCode"
              inputMode="numeric"
              placeholder="00000-000"
              maxLength={9}
              {...formik.getFieldProps('zipCode')}
            />
            {cepLoading ? (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Estado" htmlFor="state" error={fieldError(formik, 'state')}>
          <SearchableSelect
            id="state"
            value={formik.values.state}
            options={STATES_BR}
            placeholder="UF"
            onChange={(value) => {
              if (value === formik.values.state) return;
              void formik.setFieldValue('state', value);
              void formik.setFieldValue('city', '');
              void formik.setFieldValue('cityIbge', '');
            }}
            onBlur={() => formik.setFieldTouched('state', true)}
          />
        </Field>

        <Field label="Cidade" htmlFor="city" error={fieldError(formik, 'city')}>
          <SearchableSelect
            id="city"
            value={formik.values.cityIbge}
            options={cityOptions}
            disabled={!hasState}
            placeholder={
              !hasState
                ? 'Escolha o estado primeiro'
                : cityOptionsLoading
                  ? 'Carregando cidades...'
                  : 'Selecione a cidade'
            }
            onChange={(value) => {
              void formik.setFieldValue('cityIbge', value);
              void formik.setFieldValue('city', cityOptions.find((o) => o.value === value)?.label ?? '');
            }}
            onBlur={() => formik.setFieldTouched('city', true)}
          />
        </Field>
      </div>
    </SectionCard>
  );
}
