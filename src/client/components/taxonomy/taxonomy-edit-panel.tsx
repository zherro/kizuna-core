'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Yup from 'yup';
import { HelpCircle } from 'lucide-react';
import { Label } from '@kizuna/core/client/components/ui/label';
import { Input } from '@kizuna/core/client/components/ui/input';
import { Button } from '@kizuna/core/client/components/ui/button';
import { SearchableSelect } from '@kizuna/core/client/components/ui/searchable-select';
import { ModalPanel } from '@kizuna/core/client/components/ui-better-soft/overlay/modal-panel';
import { FormField } from '@kizuna/core/client/components/ui-better-soft/forms/form-field';
import { useForm } from '@kizuna/core/client';
import { resolveLucideIcon } from '@kizuna/core/lib/utils';
import {
  TAXONOMY_LEVEL_LABEL,
  TAXONOMY_RESOURCE_BY_LEVEL,
  slugify,
  type TaxonomyCategory,
  type TaxonomyEditTarget,
  type TaxonomyGroup,
  type TaxonomyItem,
  type TaxonomyLevel,
  type TaxonomySubcategory,
} from './taxonomy-types';

type FormValues = {
  name: string;
  slug: string;
  description: string;
  active: boolean;
  categoryId: string;
  categorySubId: string;
  groupId: string;
  tags: string;
  sortOrder: string;
  icon: string;
  formKey: string;
  requestFormKey: string;
};

const EMPTY_VALUES: FormValues = {
  name: '',
  slug: '',
  description: '',
  active: true,
  categoryId: '',
  categorySubId: '',
  groupId: '',
  tags: '',
  sortOrder: '0',
  icon: '',
  formKey: '',
  requestFormKey: '',
};

function buildInitialValues(target: TaxonomyEditTarget | null): FormValues {
  if (!target) return EMPTY_VALUES;

  if (target.level === 'group') {
    const item = target.item;
    return {
      ...EMPTY_VALUES,
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      description: item?.description ?? '',
      tags: item?.tags ?? '',
      icon: item?.icon ?? '',
      active: item?.active ?? true,
      sortOrder: String(item?.sortOrder ?? target.defaultSortOrder ?? 0),
    };
  }

  if (target.level === 'category') {
    const item = target.item;
    return {
      ...EMPTY_VALUES,
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      description: item?.description ?? '',
      icon: item?.icon ?? '',
      formKey: item?.formKey ?? '',
      requestFormKey: item?.requestFormKey ?? '',
      active: item?.active ?? true,
      groupId: item?.categoryGroupId != null ? String(item.categoryGroupId) : '',
    };
  }

  if (target.level === 'subcategory') {
    const item = target.item;
    return {
      ...EMPTY_VALUES,
      name: item?.name ?? '',
      slug: item?.slug ?? '',
      description: item?.description ?? '',
      active: item?.active ?? true,
      categoryId: String(item?.categoryId ?? target.defaultCategoryId ?? ''),
    };
  }

  const item = target.item;
  return {
    ...EMPTY_VALUES,
    name: item?.name ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    active: item?.active ?? true,
    categoryId: String(item?.categoryId ?? target.defaultCategoryId ?? ''),
    categorySubId: String(item?.categorySubId ?? target.defaultCategorySubId ?? ''),
  };
}

async function checkSlugTaken(
  resource: string,
  slug: string,
  excludeId: string | number | null | undefined
) {
  const normalized = slug.trim();
  if (!normalized) return false;

  const query = new URLSearchParams({ 'filter.slug': normalized, page: '1', pageSize: '5' });

  try {
    const response = await fetch(`/api/resources/${resource}?${query.toString()}`, {
      cache: 'no-store',
    });
    if (!response.ok) return false;

    const data =
      ((await response.json().catch(() => null)) as {
        items?: Array<{ id: string | number }>;
      } | null) ?? null;
    const items = data?.items ?? [];
    return items.some((item) => String(item.id) !== String(excludeId ?? ''));
  } catch {
    return false;
  }
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';

type SlugFieldProps = {
  formik: ReturnType<typeof useForm<FormValues, Record<string, unknown>, TaxonomyItem>>['formik'];
  resource: string;
  excludeId: string | number | null;
  status: SlugStatus;
  onStatusChange: (status: SlugStatus) => void;
};

function SlugField({
  formik,
  resource,
  excludeId,
  status,
  onStatusChange,
}: Readonly<SlugFieldProps>) {
  const error =
    formik.touched.slug && typeof formik.errors.slug === 'string' ? formik.errors.slug : '';

  async function handleBlur() {
    formik.setFieldTouched('slug', true);
    const value = formik.values.slug.trim();
    if (!value) {
      onStatusChange('idle');
      return;
    }
    onStatusChange('checking');
    const taken = await checkSlugTaken(resource, value, excludeId);
    onStatusChange(taken ? 'taken' : 'available');
    if (taken) {
      formik.setFieldError('slug', 'Esse slug ja esta em uso. Escolha outro.');
    }
  }

  function handleGenerate() {
    const generated = slugify(formik.values.name);
    void formik.setFieldValue('slug', generated);
    onStatusChange('idle');
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="taxonomy-slug">Slug</Label>
        <button
          type="button"
          onClick={handleGenerate}
          className="text-xs font-medium text-primary hover:underline"
        >
          Gerar do nome
        </button>
      </div>
      <Input
        id="taxonomy-slug"
        name="slug"
        value={formik.values.slug}
        onChange={(event) => {
          void formik.setFieldValue('slug', event.target.value);
          onStatusChange('idle');
        }}
        onBlur={() => void handleBlur()}
        placeholder="ex.: troca-de-chuveiro"
      />
      {status === 'checking' ? (
        <p className="text-xs text-muted-foreground">Verificando disponibilidade...</p>
      ) : null}
      {status === 'available' && !error ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">Slug disponivel.</p>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

type TaxonomyEditPanelProps = {
  target: TaxonomyEditTarget | null;
  groups: TaxonomyGroup[];
  categories: TaxonomyCategory[];
  subcategories: TaxonomySubcategory[];
  onClose: () => void;
  onSaved: (level: TaxonomyLevel, item: TaxonomyItem) => void;
};

export function TaxonomyEditPanel({
  target,
  groups,
  categories,
  subcategories,
  onClose,
  onSaved,
}: Readonly<TaxonomyEditPanelProps>) {
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const level: TaxonomyLevel = target?.level ?? 'tag';
  const resource = TAXONOMY_RESOURCE_BY_LEVEL[level];
  const levelLabel = TAXONOMY_LEVEL_LABEL[level];
  const isEditing = Boolean(target?.item);
  const selectedId = target?.item?.id != null ? String(target.item.id) : null;

  const validationSchema = useMemo(
    () =>
      Yup.object({
        name: Yup.string().trim().required('Informe o nome.'),
        slug: Yup.string()
          .trim()
          .required('Informe o slug.')
          .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use apenas letras minusculas, numeros e hifen.'),
        description: Yup.string().max(240, 'Use no maximo 240 caracteres.'),
        tags: Yup.string().max(240, 'Use no maximo 240 caracteres.'),
        active: Yup.boolean().required(),
        categoryId:
          level === 'subcategory' || level === 'tag'
            ? Yup.string().required('Selecione a categoria.')
            : Yup.string(),
        categorySubId:
          level === 'tag' ? Yup.string().required('Selecione a especialidade.') : Yup.string(),
      }),
    [level]
  );

  const form = useForm<FormValues, Record<string, unknown>, TaxonomyItem>({
    initialValues: EMPTY_VALUES,
    validationSchema,
    resourceSubmit: {
      resource,
      selectedId,
      toPayload: (values) => {
        if (level === 'group') {
          return {
            name: values.name.trim(),
            slug: values.slug.trim(),
            description: values.description.trim(),
            tags: values.tags.trim(),
            icon: values.icon.trim(),
            sortOrder: Number(values.sortOrder) || 0,
            active: values.active,
          };
        }

        const base: Record<string, unknown> = {
          name: values.name.trim(),
          slug: values.slug.trim(),
          description: values.description.trim(),
          active: values.active,
        };
        if (level === 'category') {
          base.icon = values.icon.trim();
          base.categoryGroupId = values.groupId ? values.groupId : null;
          base.formKey = values.formKey.trim() || null;
          base.requestFormKey = values.requestFormKey.trim() || null;
        }
        if (level === 'subcategory') base.categoryId = Number(values.categoryId);
        if (level === 'tag') {
          base.categoryId = Number(values.categoryId);
          base.categorySubId = Number(values.categorySubId);
        }
        return base;
      },
      errorMessage: `Nao foi possivel salvar a ${levelLabel}.`,
      successMessage: `${levelLabel.charAt(0).toUpperCase()}${levelLabel.slice(1)} salva com sucesso.`,
      connectionErrorMessage: 'Erro de conexao com a API.',
      onSuccess: async (data) => {
        if (data.item) onSaved(level, data.item);
        onClose();
      },
    },
  });

  const { formik } = form;

  const targetKey = target
    ? `${target.level}:${target.item?.id ?? 'new'}:${target.item?.slug ?? ''}`
    : 'closed';

  useEffect(() => {
    if (!target) return;
    const timer = window.setTimeout(() => {
      formik.resetForm({ values: buildInitialValues(target) });
      formik.setTouched({});
      formik.setErrors({});
      setSlugStatus('idle');
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const IconPreview = useMemo(() => resolveLucideIcon(formik.values.icon), [formik.values.icon]);

  const groupOptions = useMemo(
    () => groups.map((group) => ({ value: String(group.id), label: group.name })),
    [groups]
  );

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: String(category.id), label: category.name })),
    [categories]
  );

  const subcategoryOptions = useMemo(() => {
    if (!formik.values.categoryId) return [];
    return subcategories
      .filter((subcategory) => String(subcategory.categoryId) === formik.values.categoryId)
      .map((subcategory) => ({ value: String(subcategory.id), label: subcategory.name }));
  }, [subcategories, formik.values.categoryId]);

  useEffect(() => {
    if (level !== 'tag' || !formik.values.categorySubId) return;
    const stillValid = subcategories.some(
      (subcategory) =>
        String(subcategory.id) === formik.values.categorySubId &&
        String(subcategory.categoryId) === formik.values.categoryId
    );
    if (!stillValid) {
      void formik.setFieldValue('categorySubId', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.categoryId]);

  return (
    <ModalPanel
      open={Boolean(target)}
      onClose={onClose}
      title={`${isEditing ? 'Editar' : 'Nova'} ${levelLabel}`}
      description={
        level === 'group'
          ? 'Grupo de topo — contexto de vida usado para guiar o usuario.'
          : level === 'category'
            ? 'Categoria — contexto de necessidade do usuario, dentro de um grupo.'
            : level === 'subcategory'
              ? 'Especialidade dentro de uma categoria — tipo de profissional.'
              : 'Tag de busca dentro de uma especialidade.'
      }
      footerFixed
      headerFixed
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void formik.submitForm()} disabled={form.submitting}>
            {form.submitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {level === 'category' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-group">Grupo</Label>
            <SearchableSelect
              id="taxonomy-group"
              value={formik.values.groupId}
              onChange={(value) => void formik.setFieldValue('groupId', value)}
              onBlur={() => formik.setFieldTouched('groupId', true)}
              options={groupOptions}
              placeholder="Selecione um grupo"
              disabled={groupOptions.length === 0}
            />
          </div>
        ) : null}

        {level === 'subcategory' || level === 'tag' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-category">Categoria</Label>
            <SearchableSelect
              id="taxonomy-category"
              value={formik.values.categoryId}
              onChange={(value) => void formik.setFieldValue('categoryId', value)}
              onBlur={() => formik.setFieldTouched('categoryId', true)}
              options={categoryOptions}
              placeholder="Selecione uma categoria"
              disabled={categoryOptions.length === 0}
            />
            {formik.touched.categoryId && formik.errors.categoryId ? (
              <p className="text-xs text-red-400">{formik.errors.categoryId}</p>
            ) : null}
          </div>
        ) : null}

        {level === 'tag' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-subcategory">Especialidade</Label>
            <SearchableSelect
              id="taxonomy-subcategory"
              value={formik.values.categorySubId}
              onChange={(value) => void formik.setFieldValue('categorySubId', value)}
              onBlur={() => formik.setFieldTouched('categorySubId', true)}
              options={subcategoryOptions}
              placeholder={
                formik.values.categoryId
                  ? 'Selecione uma especialidade'
                  : 'Escolha a categoria primeiro'
              }
              disabled={!formik.values.categoryId}
            />
            {formik.touched.categorySubId && formik.errors.categorySubId ? (
              <p className="text-xs text-red-400">{formik.errors.categorySubId}</p>
            ) : null}
          </div>
        ) : null}

        <FormField formik={formik} field="name" label="Nome" placeholder="Ex.: Eletricista" />

        <SlugField
          formik={formik}
          resource={resource}
          excludeId={selectedId}
          status={slugStatus}
          onStatusChange={setSlugStatus}
        />

        <FormField
          formik={formik}
          field="description"
          as="textarea"
          label="Descricao"
          placeholder="Opcional"
          rows={3}
        />

        {level === 'group' ? (
          <FormField
            formik={formik}
            field="tags"
            label="Tags de destaque"
            placeholder="Ex.: casa, reforma, reparo"
          />
        ) : null}

        {level === 'group' || level === 'category' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-icon">Icone</Label>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted/30">
                {IconPreview ? (
                  <IconPreview className="h-4 w-4 text-foreground" />
                ) : (
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <Input
                id="taxonomy-icon"
                name="icon"
                value={formik.values.icon}
                onChange={(event) => void formik.setFieldValue('icon', event.target.value.trim())}
                placeholder="Nome do icone (lucide-react), ex.: Home"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nome de um icone de{' '}
              <a
                href="https://lucide.dev/icons"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                lucide.dev/icons
              </a>
              , ex.: Home, Car, Sparkles.
            </p>
          </div>
        ) : null}

        {level === 'category' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-form-key">Formulario dinamico (form_key)</Label>
            <Input
              id="taxonomy-form-key"
              name="formKey"
              value={formik.values.formKey}
              onChange={(event) =>
                void formik.setFieldValue('formKey', event.target.value.trim())
              }
              placeholder="ex.: eventos_som_iluminacao (opcional)"
            />
            <p className="text-xs text-muted-foreground">
              Chave de um formulario ativo em{' '}
              <a href="/painel/administracao/formularios" className="underline">
                Formularios
              </a>
              . Quando preenchida, o wizard de servicos mostra as perguntas desse formulario para
              esta categoria.
            </p>
          </div>
        ) : null}

        {level === 'category' ? (
          <div className="space-y-2">
            <Label htmlFor="taxonomy-request-form-key">
              Formulário de solicitação (request_form_key)
            </Label>
            <Input
              id="taxonomy-request-form-key"
              name="requestFormKey"
              value={formik.values.requestFormKey}
              onChange={(event) =>
                void formik.setFieldValue('requestFormKey', event.target.value.trim())
              }
              placeholder="ex.: solicitacao_orcamento_eventos (opcional)"
            />
            <p className="text-xs text-muted-foreground">
              Chave de um formulario ativo em{' '}
              <a href="/painel/administracao/formularios" className="underline">
                Formularios
              </a>
              . Quando preenchida, o comprador preenche esse formulario ao solicitar um orcamento
              ou fechar um pedido nesta categoria.
            </p>
          </div>
        ) : null}

        <FormField formik={formik} field="active" as="switch" label="Ativo" />
      </div>
    </ModalPanel>
  );
}
