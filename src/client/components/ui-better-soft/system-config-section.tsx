'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { BsButton } from './buttons/bs-button';
import { ToggleRow } from './toggle-row';

export type SystemConfigFieldSpec =
  | {
      type: 'toggle';
      key: string;
      title: string;
      subtitle?: string;
      disabledWhen?: (value: Record<string, unknown>) => boolean;
    }
  | {
      type: 'select';
      key: string;
      label: string;
      options: Array<{ value: string; label: string }>;
      disabledWhen?: (value: Record<string, unknown>) => boolean;
    }
  | {
      type: 'textarea';
      key: string;
      label: string;
      placeholder?: string;
      helperText?: string;
      disabledWhen?: (value: Record<string, unknown>) => boolean;
    };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Saves one `auth.system_config` row's whole `value` through the generic
 * `/api/resources/system_config/<key>` resource route (any project consuming the `system_config`
 * plugin exposes this the same way — see `plugins/system_config/0001_system_config.sql`). PATCH
 * first (the row already exists once a project seeds its own config values); a 404 means a fresh
 * database that hasn't been seeded yet, so it falls back to POST-create with the same key/value.
 */
async function saveConfigKey(
  key: string,
  value: unknown
): Promise<{ ok: boolean; message?: string }> {
  const body = JSON.stringify({ key, value });

  const patchRes = await fetch(`/api/resources/system_config/${key}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (patchRes.status === 404) {
    const postRes = await fetch('/api/resources/system_config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const postData = await postRes.json().catch(() => ({}));
    return { ok: postRes.ok, message: postData?.message };
  }

  const patchData = await patchRes.json().catch(() => ({}));
  return { ok: patchRes.ok, message: patchData?.message };
}

function SaveFeedback({ state }: Readonly<{ state: SaveState }>) {
  if (state === 'saved') {
    return <p className="text-xs font-medium text-emerald-600">Salvo com sucesso.</p>;
  }
  if (state === 'error') {
    return <p className="text-xs font-medium text-destructive">Não foi possível salvar.</p>;
  }
  return null;
}

export type SystemConfigSectionProps = {
  /** The `auth.system_config.key` this section edits — the whole `value` jsonb is owned by this section. */
  configKey: string;
  title: string;
  description?: string;
  fields: SystemConfigFieldSpec[];
  initialValue: Record<string, unknown>;
};

/**
 * One editable `auth.system_config` row, driven entirely by `fields` — a project defines which
 * keys of the jsonb `value` exist and how to edit them (toggle/select/textarea), this component
 * renders the card and handles save. Generic: knows nothing about what the config key actually
 * means (a project's own screen supplies that via `title`/`description`/field labels).
 */
export function SystemConfigSection({
  configKey,
  title,
  description,
  fields,
  initialValue,
}: Readonly<SystemConfigSectionProps>) {
  const [value, setValue] = useState<Record<string, unknown>>(initialValue);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  function setField(key: string, fieldValue: unknown) {
    setValue((current) => ({ ...current, [key]: fieldValue }));
    setSaveState('idle');
  }

  async function handleSave() {
    setSaveState('saving');
    const result = await saveConfigKey(configKey, value);
    setSaveState(result.ok ? 'saved' : 'error');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => {
          const disabled = field.disabledWhen?.(value) ?? false;

          if (field.type === 'toggle') {
            return (
              <ToggleRow
                key={field.key}
                title={field.title}
                subtitle={field.subtitle}
                checked={Boolean(value[field.key])}
                disabled={disabled}
                onChange={(checked) => setField(field.key, checked)}
              />
            );
          }

          if (field.type === 'select') {
            return (
              <div className="space-y-1.5" key={field.key}>
                <Label htmlFor={`${configKey}-${field.key}`}>{field.label}</Label>
                <select
                  id={`${configKey}-${field.key}`}
                  className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={String(value[field.key] ?? '')}
                  disabled={disabled}
                  onChange={(e) => setField(field.key, e.target.value)}
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div className="space-y-1.5" key={field.key}>
              <Label htmlFor={`${configKey}-${field.key}`}>{field.label}</Label>
              <Textarea
                id={`${configKey}-${field.key}`}
                rows={3}
                placeholder={field.placeholder}
                disabled={disabled}
                value={(value[field.key] as string | null | undefined) ?? ''}
                onChange={(e) => {
                  const text = e.target.value;
                  setField(field.key, text.trim() ? text : null);
                }}
              />
              {field.helperText ? (
                <p className="text-xs text-muted-foreground">{field.helperText}</p>
              ) : null}
            </div>
          );
        })}

        <div className="flex items-center justify-between gap-4 pt-2">
          <SaveFeedback state={saveState} />
          <BsButton
            label={saveState === 'saving' ? 'Salvando...' : 'Salvar'}
            icon={Save}
            disabled={saveState === 'saving'}
            onClick={() => void handleSave()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
