'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTable } from '../../hooks/use-table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { FormBuilder, type FormSchema } from '../form-builder';

type FormRow = {
  id: string | number;
  formKey: string;
  title: string;
  description: string;
  schema: FormSchema;
  version: number;
  isReusable: boolean;
  active: boolean;
};

const EMPTY_SCHEMA: FormSchema = { title: '', description: '', fields: [] } as FormSchema;

const SLUG_RE = /^[a-z][a-z0-9_]*$/;

type EditState = {
  id: string | number | null;
  formKey: string;
  title: string;
  description: string;
  isReusable: boolean;
  active: boolean;
  schema: FormSchema;
};

function blankEdit(): EditState {
  return {
    id: null,
    formKey: '',
    title: '',
    description: '',
    isReusable: true,
    active: true,
    schema: EMPTY_SCHEMA,
  };
}

/**
 * Admin surface for the `forms` plugin table: list every form, create a new one, or edit an
 * existing one's metadata + `schema` (via the form-builder `FormBuilder`). Save is a
 * POST/PUT against the generic `forms` resource route. `version` is bumped server-side by the
 * `fn_forms_bump_version` trigger whenever `schema` actually changes.
 */
export function FormsAdmin() {
  const table = useTable<FormRow>({
    resource: 'forms',
    orderBy: 'title',
    orderDirection: 'asc',
    pageSize: 12,
  });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const openNew = useCallback(() => {
    setSaveError('');
    setEdit(blankEdit());
  }, []);

  const openEdit = useCallback((row: FormRow) => {
    setSaveError('');
    setEdit({
      id: row.id,
      formKey: row.formKey,
      title: row.title,
      description: row.description ?? '',
      isReusable: row.isReusable,
      active: row.active,
      schema:
        row.schema && Object.keys(row.schema).length > 0 ? row.schema : EMPTY_SCHEMA,
    });
  }, []);

  const close = useCallback(() => setEdit(null), []);

  const save = useCallback(async () => {
    if (!edit) return;
    if (!SLUG_RE.test(edit.formKey.trim())) {
      setSaveError('form_key invalido — use minusculas, comecando por letra (ex.: eventos_som).');
      return;
    }
    if (!edit.title.trim()) {
      setSaveError('Informe um titulo.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const body = {
        formKey: edit.formKey.trim(),
        title: edit.title.trim(),
        description: edit.description.trim(),
        isReusable: edit.isReusable,
        active: edit.active,
        schema: edit.schema,
      };
      const url = edit.id ? `/api/resources/forms/${edit.id}` : '/api/resources/forms';
      const response = await fetch(url, {
        method: edit.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setSaveError(data?.message || 'Nao foi possivel salvar o formulario.');
        return;
      }
      close();
      await table.refresh();
    } catch {
      setSaveError('Erro de conexao ao salvar o formulario.');
    } finally {
      setSaving(false);
    }
  }, [edit, close, table]);

  useEffect(() => {
    if (!edit) setSaveError('');
  }, [edit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <form {...table.searchFormProps} className="flex-1">
          <Input
            {...table.searchInputProps}
            placeholder="Buscar por chave, titulo ou descricao"
          />
        </form>
        <Button onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Novo formulario
        </Button>
      </div>

      {table.error ? <p className="text-xs text-red-400">{table.error}</p> : null}

      <ul className="divide-y divide-border rounded-md border border-border">
        {table.loading ? (
          <li className="px-3 py-3 text-sm text-muted-foreground">Carregando...</li>
        ) : table.items.length === 0 ? (
          <li className="px-3 py-3 text-sm text-muted-foreground">
            Nenhum formulario cadastrado.
          </li>
        ) : (
          table.items.map((row) => (
            <li
              key={String(row.id)}
              className="flex items-center justify-between gap-3 px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {row.title}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({row.formKey})
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  v{row.version} · {row.isReusable ? 'reutilizavel' : 'exclusivo'} ·{' '}
                  {row.active ? 'ativo' : 'inativo'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                Editar
              </Button>
            </li>
          ))
        )}
      </ul>

      {table.totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            disabled={!table.canGoPrevious}
            onClick={() => void table.goToPage(table.page - 1)}
          >
            Anterior
          </Button>
          <span>
            Pagina {table.page} de {table.totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!table.canGoNext}
            onClick={() => void table.goToPage(table.page + 1)}
          >
            Proxima
          </Button>
        </div>
      ) : null}

      <ModalPanel
        open={Boolean(edit)}
        onClose={close}
        title={edit?.id ? 'Editar formulario' : 'Novo formulario'}
        description="Metadados e o esquema de campos (form-builder)."
        wide
        headerFixed
        footerFixed
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        {edit ? (
          <div className="space-y-4">
            {saveError ? <p className="text-xs text-red-400">{saveError}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="form-key">Chave (form_key)</Label>
              <Input
                id="form-key"
                value={edit.formKey}
                disabled={Boolean(edit.id)}
                onChange={(e) =>
                  setEdit((cur) => (cur ? { ...cur, formKey: e.target.value } : cur))
                }
                placeholder="ex.: eventos_som_iluminacao"
              />
              {edit.id ? (
                <p className="text-xs text-muted-foreground">
                  A chave nao pode ser alterada depois de criada.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-title">Titulo</Label>
              <Input
                id="form-title"
                value={edit.title}
                onChange={(e) =>
                  setEdit((cur) => (cur ? { ...cur, title: e.target.value } : cur))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-desc">Descricao</Label>
              <Input
                id="form-desc"
                value={edit.description}
                onChange={(e) =>
                  setEdit((cur) => (cur ? { ...cur, description: e.target.value } : cur))
                }
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={edit.isReusable}
                onCheckedChange={(v: boolean) =>
                  setEdit((cur) => (cur ? { ...cur, isReusable: v } : cur))
                }
              />
              <span className="text-sm">Reutilizavel (aparece nos seletores)</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={edit.active}
                onCheckedChange={(v: boolean) =>
                  setEdit((cur) => (cur ? { ...cur, active: v } : cur))
                }
              />
              <span className="text-sm">Ativo</span>
            </div>
            <div className="border-t border-border pt-4">
              <FormBuilder
                value={edit.schema}
                onChange={(schema: FormSchema) =>
                  setEdit((cur) => (cur ? { ...cur, schema } : cur))
                }
              />
            </div>
          </div>
        ) : null}
      </ModalPanel>
    </div>
  );
}
