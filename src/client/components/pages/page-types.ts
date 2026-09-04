/**
 * Shape of a `pages` row as returned by the resource `mapOutput` (see
 * `screen-engine/resources/pages.ts`).
 */
export type PageRecord = {
  id: number | string;
  uid?: string;
  slug: string;
  title: string;
  description?: string | null;
  content: string;
  status: 'draft' | 'published' | string;
  active: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
