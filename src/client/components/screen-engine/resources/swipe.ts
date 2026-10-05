import type { ResourceConfig } from '../types/resource-config';

/**
 * Resource `service_reactions` — a linha do usuário logado em `service_user_favorites` (RLS por
 * dono). Gostei = `action 'like'`; favorito implica gostei (`favorite ⇒ action = 'like'`).
 * Leitura exige login (default). Spread em `postgrestResources` do projeto.
 */
export const resourceServiceReactions: Record<string, ResourceConfig> = {
  service_reactions: {
    schema: 'public',
    table: 'service_user_favorites',
    select: 'uid,service_uid,action,favorite,updated_at',
    primaryKey: 'uid',
    defaultOrder: 'updated_at',
    searchableColumns: [],
    requiredFields: ['service_uid'],
    maxPageSize: 500,
    // POST é upsert por (usuário, anúncio): curtir/passar de novo atualiza a mesma linha.
    upsertOn: 'user_id,service_uid',
    mapInput: (input) => {
      const liked = input.favorite === true || input.liked === true;
      const out: Record<string, unknown> = {
        service_uid: input.serviceUid,
        action: liked ? 'like' : 'skip',
      };
      // Curtir não mexe no favorito; passar/descurtir o desliga (favorito implica gostei).
      if (input.favorite !== undefined || !liked) out.favorite = liked && input.favorite === true;
      return out;
    },
    mapOutput: (r) => ({
      uid: String(r.uid ?? ''),
      serviceUid: String(r.service_uid ?? ''),
      liked: r.action === 'like',
      favorite: Boolean(r.favorite),
      updatedAt: String(r.updated_at ?? ''),
    }),
  },
  /**
   * Curtidos do usuário (/curtidos): a mesma tabela com o anúncio embutido (`services!inner`), só
   * anúncios ativos. Filtros pela URL: `filter.action=like&filter.service.active=true&...`.
   */
  liked_services: {
    schema: 'public',
    table: 'service_user_favorites',
    select:
      'uid,updated_at,action,service:services!inner(uid,title,starting_price,price_unit,extras,active,status,category:categories(name))',
    primaryKey: 'uid',
    defaultOrder: 'updated_at',
    searchableColumns: [],
    mapOutput: (r) => {
      const s = (r.service ?? {}) as Record<string, unknown>;
      const extras = (s.extras ?? {}) as { coverFileId?: string; images?: string[] };
      const price = s.starting_price == null ? null : Number(s.starting_price);
      return {
        uid: String(s.uid ?? ''),
        title: String(s.title ?? ''),
        price,
        price_type: String(s.price_unit ?? ''),
        category: ((s.category ?? null) as { name?: string } | null)?.name ?? null,
        cover_file_id: extras.coverFileId || extras.images?.[0] || null,
        liked_at: String(r.updated_at ?? ''),
      };
    },
  },
};
