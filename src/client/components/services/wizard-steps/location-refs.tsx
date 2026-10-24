'use client';

import { useId } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ServiceRefPicker } from '../../form-builder';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';

/**
 * Vínculo do anúncio com OUTROS anúncios no passo `location` (ex.: o local do evento, os pontos de
 * venda de ingresso). Busca só nos grupos de `groups` e grava em `services.extras[key]`, no mesmo
 * formato que a tela de detalhe já lê (`resolveServiceRefs`):
 * - um só (`multiple` falso): `extras[key] = "<uid>"` (ex.: `local_ref`);
 * - vários: `extras[key] = [{ nome: "<uid>", link? }]` (ex.: `pontos_de_venda`).
 * Valores antigos com código (`extras.codigo`, de importadores) continuam válidos.
 */
export type LocationRefConfig = {
  /** Chave em `services.extras` (slug `^[a-z][a-z0-9_]*$`). */
  key: string;
  label: string;
  hint?: string;
  /** Slugs de grupo (`categories_group.slug`) em que a busca procura (ex.: `["lugares"]`). */
  groups: string[];
  placeholder?: string;
  /** Vários itens (lista) em vez de um. */
  multiple?: boolean;
  /** Só com `multiple`: cada item tem também um link (ex.: compra do ingresso naquele ponto). */
  withLink?: boolean;
  /** Rótulo do campo de link (padrão "Link"). */
  linkLabel?: string;
  /** Texto do botão de adicionar (padrão "Adicionar"). */
  addLabel?: string;
};

export type LocationRefItem = { nome: string; link?: string };

const KEY_RE = /^[a-z][a-z0-9_]*$/;

export function validateLocationRefs(refs: unknown): void {
  if (refs === undefined) return;
  if (!Array.isArray(refs)) throw new Error('stepProfiles.location: "refs" precisa ser uma lista');
  const seen = new Set<string>();
  for (const ref of refs as LocationRefConfig[]) {
    if (!ref || typeof ref.key !== 'string' || !KEY_RE.test(ref.key)) {
      throw new Error(`stepProfiles.location: refs.key inválido "${String(ref?.key)}"`);
    }
    if (seen.has(ref.key)) throw new Error(`stepProfiles.location: refs.key repetido "${ref.key}"`);
    seen.add(ref.key);
    if (typeof ref.label !== 'string' || !ref.label.trim()) {
      throw new Error(`stepProfiles.location: refs.${ref.key}.label é obrigatório`);
    }
    if (!Array.isArray(ref.groups) || !ref.groups.length || ref.groups.some((g) => typeof g !== 'string' || !g.trim())) {
      throw new Error(`stepProfiles.location: refs.${ref.key}.groups precisa de ao menos um slug de grupo`);
    }
    if (ref.withLink && !ref.multiple) {
      throw new Error(`stepProfiles.location: refs.${ref.key}.withLink só vale com multiple`);
    }
  }
}

/** Valor salvo → um uid/código (um só). */
export function refSingleValue(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) return refItems(raw)[0]?.nome ?? '';
  return '';
}

/** Valor salvo → itens `{ nome, link? }` (aceita strings soltas). */
export function refItems(raw: unknown): LocationRefItem[] {
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' && raw.trim() ? [raw] : [];
  const out: LocationRefItem[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      out.push({ nome: item.trim() });
    } else if (item && typeof item === 'object') {
      const { nome, link } = item as { nome?: unknown; link?: unknown };
      out.push({
        nome: typeof nome === 'string' ? nome.trim() : '',
        ...(typeof link === 'string' && link.trim() ? { link: link.trim() } : {}),
      });
    }
  }
  return out;
}

/** O que vai para `extras[key]`: vazios saem; um só vazio vira `null` (apaga). */
export function refPersistValue(ref: LocationRefConfig, raw: unknown): unknown {
  if (!ref.multiple) return refSingleValue(raw) || null;
  return refItems(raw)
    .filter((i) => i.nome)
    .map((i) => (ref.withLink && i.link ? { nome: i.nome, link: i.link } : { nome: i.nome }));
}

export function LocationRefsEditor({
  refs,
  values,
  onChange,
}: {
  refs: LocationRefConfig[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (!refs.length) return null;
  return (
    <div className="space-y-6">
      {refs.map((ref) => (
        <LocationRefSection key={ref.key} config={ref} value={values[ref.key]} onChange={(v) => onChange(ref.key, v)} />
      ))}
    </div>
  );
}

function LocationRefSection({
  config,
  value,
  onChange,
}: {
  config: LocationRefConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = useId();
  const filter = { groupSlugs: config.groups };

  const header = (
    <div>
      <p className="text-sm font-semibold text-foreground">{config.label}</p>
      {config.hint ? <p className="text-sm text-muted-foreground">{config.hint}</p> : null}
    </div>
  );

  if (!config.multiple) {
    return (
      <section className="space-y-3 border-t border-border pt-6">
        {header}
        <ServiceRefPicker
          id={id}
          value={refSingleValue(value)}
          filter={filter}
          placeholder={config.placeholder ?? 'Buscar pelo nome…'}
          onChange={(uid) => onChange(uid ?? '')}
        />
      </section>
    );
  }

  const items = refItems(value);
  const setItem = (index: number, next: LocationRefItem) =>
    onChange(items.map((item, i) => (i === index ? next : item)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => onChange([...items, { nome: '' }]);

  return (
    <section className="space-y-3 border-t border-border pt-6">
      {header}
      {items.length ? (
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2 rounded-xl border border-border p-3">
              <div className={config.withLink ? 'grid min-w-0 flex-1 gap-2 sm:grid-cols-2' : 'min-w-0 flex-1'}>
                <ServiceRefPicker
                  id={`${id}-${index}`}
                  value={item.nome}
                  filter={filter}
                  placeholder={config.placeholder ?? 'Buscar pelo nome…'}
                  onChange={(uid) => setItem(index, { ...item, nome: uid ?? '' })}
                />
                {config.withLink ? (
                  <Input
                    type="url"
                    inputMode="url"
                    aria-label={config.linkLabel ?? 'Link'}
                    placeholder={config.linkLabel ?? 'Link (https://)'}
                    value={item.link ?? ''}
                    onChange={(e) => setItem(index, { ...item, link: e.target.value })}
                  />
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover"
                className="h-10 w-10 shrink-0"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> {config.addLabel ?? 'Adicionar'}
      </Button>
    </section>
  );
}
