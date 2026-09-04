'use client';

import { useState } from 'react';
import { Button } from '../ui/button';
import { Code, List } from 'lucide-react';
import { NON_VALUE_TYPES, fieldKey, type FormSchema, type FormValues } from './types';
import { collectOutput, isFieldVisible } from './validate';

type Props = {
  schema: FormSchema;
  values: FormValues;
};

function formatValue(v: unknown): string {
  if (v == null || v === '') return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  return String(v);
}

export function FormResultViewer({ schema, values }: Props) {
  const [mode, setMode] = useState<'list' | 'json'>('list');
  const output = collectOutput(schema, values);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Respostas</h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={mode === 'list' ? 'default' : 'outline'}
            onClick={() => setMode('list')}
          >
            <List className="mr-1 h-3.5 w-3.5" /> Lista
          </Button>
          <Button
            size="sm"
            variant={mode === 'json' ? 'default' : 'outline'}
            onClick={() => setMode('json')}
          >
            <Code className="mr-1 h-3.5 w-3.5" /> JSON
          </Button>
        </div>
      </div>
      {mode === 'list' ? (
        <div className="divide-y rounded-md border">
          {schema.fields
            .filter((f) => !NON_VALUE_TYPES.has(f.type) && f.type !== 'hidden')
            .map((f) => {
              const key = fieldKey(f);
              const visible = isFieldVisible(f, values);
              return (
                <div
                  key={f.id}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium text-muted-foreground">
                    {f.label || key}
                  </span>
                  <span className="truncate">
                    {visible ? formatValue(values[key]) : <em className="text-muted-foreground">oculto</em>}
                  </span>
                </div>
              );
            })}
        </div>
      ) : (
        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
