'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Send, X } from 'lucide-react';
import { AssistantIcon } from './assistant-icon';
import type {
  AgentFilter,
  SearchChatMessage,
  SearchChatResponse,
} from './search-types';

type Props = {
  location: { state: string; cityId: number | null; cityName: string | null };
  filtrosAtuais: AgentFilter;
  onAgentResult: (r: SearchChatResponse) => void;
  variant: 'sidebar' | 'sheet';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Fecha o painel (variant="sidebar" apenas) — mostra um X no header quando presente. */
  onClose?: () => void;
  /** Mensagem a enviar automaticamente assim que o componente processar (ex.: veio da busca do hero). */
  pendingMessage?: string | null;
  /** Chamado depois que `pendingMessage` foi enviado, pra quem chama limpar o valor. */
  onPendingMessageSent?: () => void;
};

const GREETING: SearchChatMessage = {
  role: 'assistant',
  content: 'Oi! Me conta o que você precisa que eu ajudo a encontrar.',
};

// Xingamento / texto sem sentido — não vale virar `query` no fallback sem IA (busca lixo e ainda
// ecoa palavrão no filtro). Lista curta e com limite de palavra; erra pouco pro nosso caso.
const JUNK_RE =
  /\b(cu|c[uú]z[aã]o|caralh\w*|porra|p\w*qp|pqp|merd\w*|bost\w*|fdp|puta|putaria|put[oa]|viad\w*|arromba\w*|ot[aá]ri\w*|desgra[çc]\w*|corn[oa]|bucet\w*|pirok\w*|fod[ae]\w*|vsf|vtnc|tnc|krl)\b|\btoma(r)? no\b|\bvai (se |tomar|pra puta)/i;

/** Frase curta que parece uma busca de verdade (curta, tem palavra real, sem xingamento). */
function looksLikeQuery(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 4) return false;
  if (!/[a-zà-ú]{3,}/i.test(text)) return false;
  return !JUNK_RE.test(text);
}

export function SearchChat({
  location,
  filtrosAtuais,
  onAgentResult,
  variant,
  collapsed = false,
  onToggleCollapsed,
  onClose,
  pendingMessage,
  onPendingMessageSent,
}: Props) {
  const [messages, setMessages] = useState<SearchChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle');
  const listRef = useRef<HTMLDivElement>(null);
  const lastUserRef = useRef<string>('');

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, status]);

  useEffect(() => {
    if (!pendingMessage) return;
    send(pendingMessage);
    onPendingMessageSent?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingMessage]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || status === 'sending') return;
    lastUserRef.current = trimmed;
    const nextMessages: SearchChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setStatus('sending');

    try {
      const res = await fetch('/api/ai/search-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.filter((m) => m !== GREETING),
          location,
          filtrosAtuais,
        }),
      });

      if (res.status === 503) {
        // Fallback sem IA (sem custo): frase curta que parece uma busca vira `query`; frase longa,
        // texto sem sentido ou xingamento não — aí só orienta a usar os filtros.
        const canQuery = looksLikeQuery(trimmed);
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content: canQuery
              ? 'Tô com um problema pra pensar agora, então filtrei direto pelo que você escreveu. Se vier pouca coisa, ajusta pelos filtros ao lado.'
              : 'Tô com um problema pra pensar agora. Me diz em poucas palavras o que você procura (ex.: “eletricista”, “diarista pra faxina”) ou use os filtros ao lado.',
          },
        ]);
        if (canQuery) {
          onAgentResult({
            mensagem_usuario: '',
            resumo: '',
            precisa_mais_info: false,
            filtro: { query: trimmed },
          });
        }
        setStatus('idle');
        return;
      }

      if (!res.ok) throw new Error(String(res.status));

      const data = (await res.json()) as SearchChatResponse;
      setMessages((m) => [...m, { role: 'assistant', content: data.mensagem_usuario }]);
      onAgentResult(data);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  const header = (
    <div className="flex items-center gap-2 border-b border-border px-3 py-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-4 w-4" />
      </span>
      <span className="flex-1 text-sm font-semibold">Assistente de busca</span>
      {variant === 'sheet' && onToggleCollapsed && (
        <button onClick={onToggleCollapsed} aria-label="Recolher" className="text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </button>
      )}
      {variant === 'sidebar' && onClose && (
        <button onClick={onClose} aria-label="Fechar assistente" className="text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const body = (
    <>
      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground'
                : 'mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm'
            }
          >
            {m.content}
          </div>
        ))}
        {status === 'sending' && (
          <div className="mr-auto rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
            digitando…
          </div>
        )}
        {status === 'error' && (
          <div className="mr-auto max-w-[85%] rounded-2xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Não consegui responder.{' '}
            <button className="font-semibold underline" onClick={() => send(lastUserRef.current)}>
              Tentar de novo
            </button>
          </div>
        )}
      </div>
      <form
        className="flex items-center gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Descreva o que procura…"
          disabled={status === 'sending'}
          className="h-9 flex-1 rounded-full border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <button
          type="submit"
          disabled={status === 'sending' || !input.trim()}
          aria-label="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </>
  );

  if (variant === 'sheet') {
    if (collapsed) {
      return (
        <button
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-t-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
        >
          <AssistantIcon className="h-8 w-8" /> Falar com o assistente
        </button>
      );
    }
    return (
      <div className="flex h-[75dvh] flex-col rounded-t-2xl border-t border-border bg-card shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {header}
      {body}
    </div>
  );
}
