import { ExternalLink } from 'lucide-react';
import { CopyValueButton } from './copy-value-button';
import type { FormSchema, FormValues } from '../../form-builder';
import {
  buildExtraFieldBlocks,
  type ExtraBlock,
  type ExtraListEntry,
  type FormattedValue,
} from './ad-extra-fields-format';

const CARD_CLASS =
  'rounded-[var(--ui-radius-card,1rem)] border-[length:var(--ui-border-w-card,1px)] border-border bg-card shadow-[shadow:var(--ui-shadow-item,0_0_#0000)]';

const LINK_CLASS =
  'inline-flex max-w-full items-center gap-1 font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand';

function Value({ value, label }: { value: FormattedValue; label?: string }) {
  if (!value.href) return <>{value.text}</>;
  const copyable = /^(tel|mailto):/i.test(value.href);
  const link = (
    <a
      href={value.href}
      className={LINK_CLASS}
      {...(value.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      <span className="min-w-0 truncate" title={value.href}>
        {value.text}
      </span>
      {value.external && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
    </a>
  );
  if (!copyable) return link;
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      {link}
      <CopyValueButton value={value.text} label={label ?? 'contato'} />
    </span>
  );
}

function EntryCard({ entry }: { entry: ExtraListEntry }) {
  return (
    <li className="flex flex-col gap-1.5 rounded-[var(--ui-radius-card,1rem)] bg-muted/60 p-4">
      {(entry.lead || entry.amount) && (
        <div className="flex items-baseline justify-between gap-3">
          {entry.lead ? (
            <div className="min-w-0 font-bold leading-snug [overflow-wrap:anywhere]">{entry.lead}</div>
          ) : (
            <span />
          )}
          {entry.amount && (
            <div className="shrink-0 text-lg font-black leading-none text-brand">{entry.amount}</div>
          )}
        </div>
      )}
      {entry.meta.length > 0 && (
        <div className="text-sm leading-snug text-muted-foreground">{entry.meta.join(' · ')}</div>
      )}
      {entry.facts.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {entry.facts.map((f) => (
            <span key={f.label} className="inline-flex flex-wrap items-baseline gap-1.5">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-semibold">
                <Value value={f.value} />
              </span>
            </span>
          ))}
        </div>
      )}
      {entry.note && <p className="whitespace-pre-line text-sm text-muted-foreground">{entry.note}</p>}
    </li>
  );
}

function Block({ block }: { block: ExtraBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 className="font-display text-base font-bold tracking-tight">{block.text}</h3>;
    case 'fields':
      return (
        <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 ${CARD_CLASS}`}>
          {block.items.map((item) => (
            <div key={item.key} className={`min-w-0 ${item.wide ? 'sm:col-span-2' : ''}`}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd
                className={`mt-0.5 text-sm font-semibold leading-snug [overflow-wrap:anywhere] ${
                  item.wide ? 'whitespace-pre-line font-medium' : ''
                }`}
              >
                <Value value={item.value} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case 'chips':
      return (
        <div>
          <div className="mb-2 text-xs text-muted-foreground">{block.label}</div>
          <ul className="flex flex-wrap gap-1.5">
            {block.items.map((name, i) => (
              <li
                key={`${name}-${i}`}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'entries':
      return (
        <div>
          <div className="mb-2 text-xs text-muted-foreground">{block.label}</div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {block.entries.map((entry, i) => (
              <EntryCard key={i} entry={entry} />
            ))}
          </ul>
        </div>
      );
  }
}

/**
 * Renderização pública das respostas dinâmicas por categoria de um serviço (ver
 * `fn_get_public_service_form_answers`, plugin `services`) — uma versão de leitura do
 * `FormResultViewer` (pensado pra revisão admin/dev). Genérico: campos curtos em grade (1 coluna
 * no mobile), listas (sessões, ingressos, atrações) em blocos de largura total com um cartão por
 * item, datas/horas pt-BR, moeda, labels de opção e links clicáveis. Campo vazio não aparece; a
 * ordem é a do schema. Montagem em `buildExtraFieldBlocks` (puro, testado).
 */
export function AdExtraFields({ schema, answers }: { schema: FormSchema; answers: FormValues }) {
  const blocks = buildExtraFieldBlocks(schema, answers);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={`${block.kind}-${block.key}-${i}`} block={block} />
      ))}
    </div>
  );
}
