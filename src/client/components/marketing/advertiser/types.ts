/** Formas (já em camelCase) devolvidas pelos recursos do plugin marketing. Valores em centavos. */
export type Balance = { tenantId: string; balanceCents: number; creditedCents: number; committedCents: number };
export type LedgerRow = { id: string; kind: string; amountCents: number; note: string; createdAt: string };
export type IntentRow = { id: string; amountCents: number; provider: string; status: string; createdAt: string };
export type BoostRow = {
  id: string;
  serviceUid: string;
  dailyCents: number;
  startsOn: string;
  endsOn: string;
  stoppedOn: string | null;
  createdAt: string;
};
export type CampaignRow = {
  id: string;
  creativeId: string;
  slotSlug: string;
  dailyCents: number;
  startsOn: string;
  endsOn: string;
  stoppedOn: string | null;
  createdAt: string;
};
export type OwnService = { uid: string; title: string; status: string };
export type MyCreative = {
  id: string;
  format: string;
  kind: string;
  imageUrl: string;
  alt: string;
  linkUrl: string;
  label: string;
  slots: string[];
  active: boolean;
  createdAt: string;
  reviewStatus: 'pending' | 'approved' | 'rejected' | string;
  reviewReason: string;
};

export const EMPTY_BALANCE: Balance = { tenantId: '', balanceCents: 0, creditedCents: 0, committedCents: 0 };
