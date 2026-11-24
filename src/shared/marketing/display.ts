/**
 * Como o marketing aparece na tela: unidade (R$ ou créditos), se há banners, de onde vem o extrato e
 * os rótulos. Sem configuração = padrão do Bora (R$, com banners, extrato só do razão). O banco
 * continua em centavos nos dois modos: 1 crédito = R$ 1 = 100 centavos.
 */
import { formatBRL } from './cost';

export type MarketingUnit = 'brl' | 'credits';

export type StatementKind =
  | 'credit_admin'
  | 'credit_payment'
  | 'credit_bonus'
  | 'adjust'
  | 'reversal'
  | 'boost'
  | 'boost_refund'
  | 'campaign'
  | 'campaign_refund';

export type MarketingDisplay = {
  /** false esconde tudo de banner (aba do anunciante, aba do admin, textos que citam banner). Padrão true. */
  banners?: boolean;
  /** 'credits' mostra "30 créditos" (1 crédito = R$ 1; banco continua em centavos). Padrão 'brl'. */
  unit?: MarketingUnit;
  /** 'full' = extrato lê a view `vw_wallet_statement` (razão + impulsionamentos/banners como débito + devoluções). Padrão 'ledger' (só `wallet_ledger`). */
  statement?: 'ledger' | 'full';
  /** Nome do selo no texto do cabeçalho. Padrão 'BORA INDICA'. */
  badgeName?: string;
  /** Sobrescreve rótulos do extrato por kind. */
  kindLabels?: Partial<Record<StatementKind, string>>;
  /** Título da página (anunciante e admin). Padrão 'Marketing'. */
  title?: string;
  /** Onde o impulsionado aparece, no texto "O anúncio ganha o selo X e <isto>, assim que começar." */
  boostPlacement?: string;
  /** Dica do campo "Começa em". Padrão 'Data do servidor (UTC)'. */
  dateHint?: string;
};

export type ResolvedMarketingDisplay = Required<MarketingDisplay>;

export const DEFAULT_MARKETING_DISPLAY: ResolvedMarketingDisplay = {
  banners: true,
  unit: 'brl',
  statement: 'ledger',
  badgeName: 'BORA INDICA',
  kindLabels: {},
  title: 'Marketing',
  boostPlacement: 'entra na faixa de patrocinados, em todas as páginas',
  dateHint: 'Data do servidor (UTC)',
};

const orDefault = (v: string | undefined, d: string) => (v?.trim() ? v : d);

export function resolveMarketingDisplay(d?: MarketingDisplay): ResolvedMarketingDisplay {
  return {
    banners: d?.banners ?? DEFAULT_MARKETING_DISPLAY.banners,
    unit: d?.unit ?? DEFAULT_MARKETING_DISPLAY.unit,
    statement: d?.statement ?? DEFAULT_MARKETING_DISPLAY.statement,
    badgeName: d?.badgeName?.trim() ? d.badgeName : DEFAULT_MARKETING_DISPLAY.badgeName,
    kindLabels: { ...(d?.kindLabels ?? {}) },
    title: orDefault(d?.title, DEFAULT_MARKETING_DISPLAY.title),
    boostPlacement: orDefault(d?.boostPlacement, DEFAULT_MARKETING_DISPLAY.boostPlacement),
    dateHint: orDefault(d?.dateHint, DEFAULT_MARKETING_DISPLAY.dateHint),
  };
}

/** Centavos → "R$ 30,00" (brl, igual a `formatBRL`) ou "30 créditos" (credits). */
export function formatAmount(cents: number, unit: MarketingUnit): string {
  if (unit !== 'credits') return formatBRL(cents);
  const value = cents / 100;
  const text = value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${text} ${Math.abs(value) === 1 ? 'crédito' : 'créditos'}`;
}

/** Linha do extrato (`wallet_ledger` ou `vw_wallet_statement`) — só o que o rótulo usa. */
export type StatementLabelRow = { kind: string; serviceTitle?: string | null; slotSlug?: string | null; days?: number | null };

const DEFAULT_KIND_LABELS: Record<string, string> = {
  credit_admin: 'Crédito do Bora',
  credit_payment: 'Pagamento',
  adjust: 'Ajuste',
  credit_bonus: 'Bônus',
  reversal: 'Estorno',
  boost_refund: 'Devolução de impulsionamento',
  campaign_refund: 'Devolução de banner',
};

const dayCount = (n: number | null | undefined): string => {
  const d = Number(n ?? 0);
  return `${d} ${d === 1 ? 'dia' : 'dias'}`;
};

export function statementLabel(row: StatementLabelRow, display?: MarketingDisplay): string {
  const custom = display?.kindLabels?.[row.kind as StatementKind];
  if (custom) return custom;
  if (row.kind === 'boost') {
    const title = row.serviceTitle?.trim();
    return title ? `Impulsionou "${title}" por ${dayCount(row.days)}` : `Impulsionou um anúncio por ${dayCount(row.days)}`;
  }
  if (row.kind === 'campaign') return `Banner em ${row.slotSlug ?? '—'} por ${dayCount(row.days)}`;
  return DEFAULT_KIND_LABELS[row.kind] ?? row.kind;
}

/** Palavras que mudam com a unidade (e com banners ligados/desligados). */
export type MarketingWords = {
  /** Aba e rótulo curto: "Saldo" | "Créditos". */
  balance: string;
  balanceAvailable: string;
  addBalance: string;
  committed: string;
  totalCredited: string;
  balanceNow: string;
  balanceAfter: string;
  insufficient: string;
  useBalance: string;
  /** "o saldo" | "os créditos" (sujeito/objeto). */
  theBalance: string;
  /** "para o saldo" | "para os créditos". */
  toBalance: string;
  /** "ao saldo" | "aos créditos". */
  backToBalance: string;
  /** Admin: "Adicionar saldo" | "Adicionar créditos". */
  grantBalance: string;
  /** Admin, depois de lançar: "Saldo adicionado." | "Créditos adicionados." */
  granted: string;
  balanceCurrent: string;
  /** "O saldo ficará negativo." | "Os créditos ficarão negativos." */
  balanceNegative: string;
  /** Substantivo solto: "saldo" | "créditos". */
  balanceNoun: string;
  /** "no saldo" | "nos créditos". */
  inBalance: string;
  /** "no seu saldo" | "nos seus créditos". */
  inYourBalance: string;
  /** "para o seu saldo" | "para os seus créditos". */
  toYourBalance: string;
  /** Rótulo do campo de valor da recarga/lançamento. */
  amountLabel: string;
  /** Rótulo do campo da diária. */
  dailyLabel: string;
  /** "" | "1 crédito = R$ 1". */
  unitHint: string;
  /** "impulsionamentos e banners" | "impulsionamentos". */
  spendTargets: string;
  /** Texto da recarga. */
  topupLead: string;
  /** Pedido criado, sem instruções do provedor. */
  topupPending: string;
};

export function marketingWords(d?: MarketingDisplay): MarketingWords {
  const r = resolveMarketingDisplay(d);
  const credits = r.unit === 'credits';
  const spendTargets = r.banners ? 'impulsionamentos e banners' : 'impulsionamentos';
  const base = credits
    ? {
        balance: 'Créditos',
        balanceAvailable: 'Créditos disponíveis',
        addBalance: 'Comprar créditos',
        committed: 'Créditos comprometidos',
        // Soma todo crédito positivo (pagamento, bônus, admin) — não só o comprado.
        totalCredited: 'Total recebido',
        balanceNow: 'Créditos agora',
        balanceAfter: 'Créditos depois',
        insufficient: 'Créditos insuficientes',
        useBalance: 'Usar meus créditos',
        theBalance: 'os créditos',
        toBalance: 'para os créditos',
        backToBalance: 'aos créditos',
        grantBalance: 'Adicionar créditos',
        granted: 'Créditos adicionados.',
        balanceCurrent: 'Créditos atuais',
        balanceNegative: 'Os créditos ficarão negativos.',
        balanceNoun: 'créditos',
        inBalance: 'nos créditos',
        inYourBalance: 'nos seus créditos',
        toYourBalance: 'para os seus créditos',
        amountLabel: 'Créditos',
        dailyLabel: 'Diária (créditos)',
        unitHint: '1 crédito = R$ 1',
        topupPending: 'Assim que o pagamento for confirmado, os créditos entram aqui.',
      }
    : {
        balance: 'Saldo',
        balanceAvailable: 'Saldo disponível',
        addBalance: 'Adicionar saldo',
        committed: 'Já comprometido',
        totalCredited: 'Total recarregado',
        balanceNow: 'Saldo agora',
        balanceAfter: 'Saldo depois',
        insufficient: 'Saldo insuficiente',
        useBalance: 'Usar meu saldo',
        theBalance: 'o saldo',
        toBalance: 'para o saldo',
        backToBalance: 'ao saldo',
        grantBalance: 'Adicionar saldo',
        granted: 'Saldo adicionado.',
        balanceCurrent: 'Saldo atual',
        balanceNegative: 'O saldo ficará negativo.',
        balanceNoun: 'saldo',
        inBalance: 'no saldo',
        inYourBalance: 'no seu saldo',
        toYourBalance: 'para o seu saldo',
        amountLabel: 'Valor (R$)',
        dailyLabel: 'Diária (R$)',
        unitHint: '',
        topupPending: 'Assim que o pagamento for confirmado, o saldo entra aqui.',
      };
  const subject = credits ? 'Os créditos pagam' : 'O saldo paga';
  return {
    ...base,
    spendTargets,
    topupLead: `${subject} ${spendTargets}. Dias que você parar antes do fim voltam ${base.toBalance}.`,
  };
}
