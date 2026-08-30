'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { AlertTriangle, CheckCircle2, Inbox, Pencil, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { DynamicField } from './dynamic-field';
import { useDelete, useForm, useResourceOptions, useTable } from '../hooks';
import { formatDateTime } from '../../lib/helper/date.helper';
import type {
  ResourceScreenConfig,
  ResourceScreenField,
  ResourceScreenRelationField,
} from '../../types/resource-screen';

type RecordItem = Record<string, unknown> & { id: string };

function isRelationField(field: ResourceScreenField): field is ResourceScreenRelationField {
  return field.type === 'relation';
}

function defaultValueFor(field: ResourceScreenField): unknown {
  return field.type === 'switch' ? (field.defaultValue ?? true) : '';
}

function buildInitialValues(fields: ResourceScreenField[]) {
  const values: Record<string, unknown> = {};
  for (const field of fields) values[field.name] = defaultValueFor(field);
  return values;
}

function valuesFromItem(fields: ResourceScreenField[], item: RecordItem) {
  const values: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = item[field.name];
    values[field.name] = field.type === 'switch' ? Boolean(raw) : (raw?.toString() ?? '');
  }
  return values;
}

function buildValidationSchema(fields: ResourceScreenField[]) {
  const shape: Record<string, Yup.AnySchema> = {};

  for (const field of fields) {
    if (field.type === 'textarea') {
      const max = field.maxLength ?? 240;
      shape[field.name] = Yup.string().max(max, `Use no maximo ${max} caracteres.`);
    } else if (field.type === 'switch') {
      shape[field.name] = Yup.boolean().required('Informe o status.');
    } else {
      shape[field.name] =
        field.required === false
          ? Yup.string()
          : Yup.string().trim().required(`Informe ${field.label.toLowerCase()}.`);
    }
  }

  return Yup.object(shape);
}

/**
 * Generic "form + searchable/paginated list" CRUD block, driven entirely by
 * `ResourceScreenConfig`. Backs every screen registered as `resource-screen`
 * in `screen-engine/registry.ts` — `categorias` and `subcategorias` are two
 * independent resources rendered by this exact same component, which is the
 * point: the component carries no resource-specific code, only the config
 * does.
 */
export function ResourceScreen({ config }: { config: ResourceScreenConfig }) {
  const relationField = config.fields.find(isRelationField) ?? null;
  const [selectedItem, setSelectedItem] = useState<RecordItem | null>(null);

  const relationOptions = useResourceOptions<RecordItem & { id: string | number }>({
    resource: relationField?.optionsResource ?? '__none__',
    labelField: relationField?.optionsLabelField ?? 'name',
    filter: relationField?.optionsFilter,
  });

  const relationLabelField = relationField?.optionsLabelField ?? 'name';
  const relationOptionsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of relationOptions.options) {
      map.set(String(item.id), String(item[relationLabelField] ?? item.id));
    }
    return map;
  }, [relationOptions.options, relationLabelField]);

  const initialValues = useMemo(() => buildInitialValues(config.fields), [config.fields]);
  const validationSchema = useMemo(() => buildValidationSchema(config.fields), [config.fields]);
  const blockedByMissingRelation =
    Boolean(config.requireRelationToCreate) &&
    Boolean(relationField) &&
    !relationOptions.loading &&
    relationOptions.options.length === 0;

  const {
    items,
    loading,
    error: tableError,
    clearError,
    search,
    setSearch,
    page,
    total,
    totalPages,
    load,
    goToPage,
    submitSearch,
  } = useTable<RecordItem>({
    resource: config.resource,
    pageSize: config.pageSize ?? 8,
    orderBy: config.orderBy ?? 'name',
    orderDirection: config.orderDirection ?? 'asc',
  });

  function selectItem(item: RecordItem) {
    setSelectedItem(item);
    formik.setValues(valuesFromItem(config.fields, item));
    formik.setTouched({});
    formik.setErrors({});
    form.clearFeedback();
    clearError();
  }

  const messages = config.messages ?? {};

  const form = useForm<Record<string, unknown>, Record<string, unknown>, RecordItem>({
    initialValues,
    validationSchema,
    onReset: () => setSelectedItem(null),
    resourceSubmit: {
      resource: config.resource,
      selectedId: selectedItem?.id ?? null,
      errorMessage: messages.saveError ?? `Nao foi possivel salvar o registro.`,
      successMessage: messages.saveSuccess ?? `Registro salvo com sucesso.`,
      connectionErrorMessage: messages.connectionError ?? `Erro de conexao com a API.`,
      onSuccess: async (data, { reset }) => {
        const wasEditing = Boolean(selectedItem);
        await load(page, search);

        if (wasEditing && data.item) {
          selectItem(data.item);
        } else {
          reset();
        }
      },
    },
  });

  const { formik } = form;
  const selectedId = selectedItem?.id ?? null;
  const isEditing = Boolean(selectedItem);
  const error = form.error || tableError;
  const success = form.success;

  const deleteAction = useDelete({
    resource: config.resource,
    selectedId,
    errorMessage: messages.deleteError ?? `Nao foi possivel remover o registro.`,
    successMessage: messages.deleteSuccess ?? `Registro removido com sucesso.`,
    connectionErrorMessage: messages.connectionError ?? `Erro de conexao com a API.`,
    setError: form.setError,
    setSuccess: form.setSuccess,
    onSuccess: async () => {
      form.reset();
      const nextPage = items.length === 1 && page > 1 ? page - 1 : page;
      await load(nextPage, search);
    },
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(1, '');
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300 lg:col-span-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300 lg:col-span-2">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>{success}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? `Editar ${config.entitySingular}` : `Nova ${config.entitySingular}`}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? 'Atualize os dados e salve para refletir na listagem.'
              : `Preencha os campos abaixo para adicionar uma nova ${config.entitySingular}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit} className="space-y-4">
            {config.fields.map((field) => {
              const touched = Boolean(formik.touched[field.name]);
              const errorValue = formik.errors[field.name];

              return (
                <DynamicField
                  key={field.name}
                  field={field}
                  value={formik.values[field.name]}
                  error={touched && typeof errorValue === 'string' ? errorValue : undefined}
                  onChange={(value) => void formik.setFieldValue(field.name, value)}
                  onBlur={() => void formik.setFieldTouched(field.name, true)}
                  relationOptions={
                    field.type === 'relation'
                      ? relationOptions.options.map((item) => ({
                          value: String(item.id),
                          label: String(item[relationLabelField] ?? item.id),
                        }))
                      : undefined
                  }
                />
              );
            })}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                className="sm:flex-1"
                disabled={form.submitting || blockedByMissingRelation}
              >
                <Pencil className="h-4 w-4" />
                {form.submitting
                  ? 'Salvando...'
                  : isEditing
                    ? 'Salvar alteracoes'
                    : `Criar ${config.entitySingular}`}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={form.reset}
                disabled={form.submitting || deleteAction.deleting}
              >
                Limpar
              </Button>

              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void deleteAction.remove()}
                  disabled={form.submitting || deleteAction.deleting}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteAction.deleting ? 'Removendo...' : 'Excluir'}
                </Button>
              ) : null}
            </div>

            {blockedByMissingRelation ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Cadastre ao menos um registro ativo em &quot;{relationField?.label}&quot; antes de
                criar {config.entityPlural}.
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Listagem</CardTitle>
              <CardDescription>
                Selecione um registro para editar ou remova quando necessario.
              </CardDescription>
            </div>
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              {total} registro(s)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              void submitSearch(event);
              form.clearFeedback();
            }}
            className="mb-4 flex gap-2"
          >
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={config.searchPlaceholder ?? `Buscar ${config.entityPlural}`}
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <Inbox className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted-foreground">
                {config.emptyMessage ?? `Nenhum registro de ${config.entityPlural} ainda.`}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {items.map((item) => {
                  const active = item.id === selectedId;
                  const statusValue = config.list.statusField
                    ? Boolean(item[config.list.statusField])
                    : null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectItem(item)}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                        active
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:border-primary/40 hover:bg-accent/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {String(item[config.list.primaryField] ?? '')}
                          </p>
                          {config.list.secondaryField ? (
                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                              {String(item[config.list.secondaryField] ?? '')}
                            </p>
                          ) : null}
                        </div>

                        <span className="rounded-full bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                          {formatDateTime(String(item.createdAt ?? item.updatedAt ?? ''))}
                        </span>
                      </div>

                      {relationField && config.list.relationLabelPrefix ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {config.list.relationLabelPrefix}
                          {relationOptionsById.get(String(item[relationField.name])) ?? '-'}
                        </p>
                      ) : null}

                      {statusValue !== null ? (
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">
                          Status: {statusValue ? 'ATIVO' : 'INATIVO'}
                        </p>
                      ) : null}

                      {config.list.descriptionField && item[config.list.descriptionField] ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          {String(item[config.list.descriptionField])}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  Pagina {page} de {totalPages || 1}
                </p>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void goToPage(page - 1)}
                    disabled={page <= 1 || loading}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void goToPage(page + 1)}
                    disabled={totalPages === 0 || page >= totalPages || loading}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
