import { fetchAll } from './admin-api';
import type {
  BalanceRow,
  BoostMetricRow,
  BoostRow,
  CampaignRow,
  CreativeRow,
  DeliveryRow,
  LedgerRow,
  ReviewRow,
} from './admin-math';

/**
 * Leituras do painel admin (consulta direta, sem cache). Os limites de páginas protegem o navegador;
 * quando uma lista bate no teto, `truncated` avisa em vez de mostrar total errado em silêncio.
 */
export const LIMITS = { balances: 5 * 200, boosts: 10 * 200, campaigns: 10 * 200, metrics: 10 * 1000, ledger: 10 * 200 };

export const loadBalances = () => fetchAll<BalanceRow>('vw_wallet_balance', { orderBy: 'tenant_id', maxPages: 5 });
export const loadBoosts = () =>
  fetchAll<BoostRow>('boosts_admin', { orderBy: 'starts_on', orderDirection: 'desc', maxPages: 10 });
export const loadCampaigns = () =>
  fetchAll<CampaignRow>('ad_campaigns_admin', { orderBy: 'starts_on', orderDirection: 'desc', maxPages: 10 });
export const loadBoostMetrics = (from?: string) =>
  fetchAll<BoostMetricRow>('vw_boost_metrics_daily', {
    pageSize: 1000,
    maxPages: 10,
    orderBy: 'day',
    orderDirection: 'desc',
    // ordenado do mais novo ao mais antigo: para quando a página já passou do início da janela
    stopWhen: from ? (page) => page.every((r) => r.day < from) : undefined,
  });
export const loadDelivery = (from?: string) =>
  fetchAll<DeliveryRow>('vw_ad_delivery_daily', {
    pageSize: 1000,
    maxPages: 10,
    orderBy: 'day',
    orderDirection: 'desc',
    stopWhen: from ? (page) => page.every((r) => r.day < from) : undefined,
  });
export const loadLedger = (from?: string) =>
  fetchAll<LedgerRow>('wallet_ledger', {
    pageSize: 200,
    maxPages: 10,
    orderBy: 'created_at',
    orderDirection: 'desc',
    stopWhen: from ? (page) => page.every((r) => r.createdAt.slice(0, 10) < from) : undefined,
  });
export const loadCreatives = () =>
  fetchAll<CreativeRow>('ad_creatives_review', { orderBy: 'created_at', orderDirection: 'desc', maxPages: 10 });
export const loadReviews = () =>
  fetchAll<ReviewRow>('ad_creative_reviews', { pageSize: 200, maxPages: 10, orderBy: 'reviewed_at', orderDirection: 'desc' });
