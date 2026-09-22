'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { CurrencyInput } from '../../ui/currency-input';
import { Input } from '../../ui/input';
import type { PriceTableField, PriceTableRow } from './price-options';

export type PriceTableLabels = {
  title?: string;
  hint?: string;
  itemTitle?: string;
  description?: string;
  amount?: string;
  agree?: string;
  linkLabel?: string;
  linkUrl?: string;
  add?: string;
  remove?: string;
  empty?: string;
};

const DEFAULT_LABELS: Required<PriceTableLabels> = {
  title: 'Tabela de preços',
  hint: 'Adicione os itens, pacotes ou formas de pagamento com o valor de cada um.',
  itemTitle: 'Título',
  description: 'Descrição',
  amount: 'Valor (R$)',
  agree: 'A combinar',
  linkLabel: 'Texto do botão',
  linkUrl: 'Link do botão (https://…)',
  add: 'Adicionar item',
  remove: 'Remover item',
  empty: 'Nenhum item ainda.',
};

let rowSeq = 0;
const newRow = (): PriceTableRow => ({
  id: `row-${Date.now().toString(36)}-${(rowSeq += 1)}`,
  title: '',
  description: '',
  amount: 0,
  toAgree: false,
  linkLabel: '',
  linkUrl: '',
});

/**
 * Editor da tabela de preços do wizard de serviços: o usuário vai adicionando itens, cada um com
 * título, descrição, valor e botão de link (texto + URL). Quais campos aparecem é do perfil
 * (`fields`); os rótulos vêm de `messages.wizard.price.table`. O estado é controlado
 * (`rows`/`onChange`); quem usa grava em `services.extras.priceTable` (jsonb) — ver
 * `createPriceStep`. Linhas sem título são descartadas na gravação (`cleanPriceTable`).
 */
export function PriceTableEditor({
  rows,
  onChange,
  fields,
  maxRows,
  labels,
}: {
  rows: PriceTableRow[];
  onChange: (rows: PriceTableRow[]) => void;
  fields: PriceTableField[];
  maxRows?: number;
  labels?: PriceTableLabels;
}) {
  const l = { ...DEFAULT_LABELS, ...labels };
  const has = (field: PriceTableField) => fields.includes(field);
  const update = (id: string, patch: Partial<PriceTableRow>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const canAdd = maxRows === undefined || rows.length < maxRows;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{l.title}</p>
        <p className="text-xs text-muted-foreground">{l.hint}</p>
      </div>

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{l.empty}</p> : null}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="space-y-2 rounded-xl border bg-background p-3">
            <div className="flex items-start gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-[1fr_15rem]">
                <Input
                  value={row.title}
                  onChange={(event) => update(row.id, { title: event.target.value.slice(0, 80) })}
                  placeholder={l.itemTitle}
                  aria-label={l.itemTitle}
                />
                {has('amount') ? (
                  <div className="flex gap-2">
                    <CurrencyInput
                      value={row.toAgree ? 0 : row.amount}
                      onValueChange={(amount) => update(row.id, { amount })}
                      disabled={row.toAgree}
                      aria-label={l.amount}
                    />
                    <Button
                      type="button"
                      variant={row.toAgree ? 'default' : 'outline'}
                      aria-pressed={Boolean(row.toAgree)}
                      className="shrink-0"
                      onClick={() =>
                        update(row.id, { toAgree: !row.toAgree, amount: 0 })
                      }
                    >
                      {l.agree}
                    </Button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={l.remove}
                onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {has('description') ? (
              <Input
                value={row.description}
                onChange={(event) =>
                  update(row.id, { description: event.target.value.slice(0, 200) })
                }
                placeholder={l.description}
                aria-label={l.description}
              />
            ) : null}

            {has('link') ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_1fr]">
                <Input
                  value={row.linkLabel}
                  onChange={(event) =>
                    update(row.id, { linkLabel: event.target.value.slice(0, 30) })
                  }
                  placeholder={l.linkLabel}
                  aria-label={l.linkLabel}
                />
                <Input
                  type="url"
                  inputMode="url"
                  value={row.linkUrl}
                  onChange={(event) => update(row.id, { linkUrl: event.target.value.trim() })}
                  placeholder={l.linkUrl}
                  aria-label={l.linkUrl}
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, newRow()])}
        >
          <Plus className="mr-1 h-4 w-4" />
          {l.add}
        </Button>
      ) : null}
    </div>
  );
}
