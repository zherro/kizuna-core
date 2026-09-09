import { submitResource } from '../../../../lib/resource-submit';
import type { ServiceSubcategoryLink } from '../service-type';

/**
 * Reconcile the `service_categories_sub` join rows for a service — the DELETE/POST-per-link diff
 * ported from the old `service-wizard.tsx` `syncSubcategoryLinks` (346-434).
 *
 * `prevLinks` is the set of links known to exist server-side. Steps never fetch, so:
 *  - create mode: `prevLinks` is `[]` → this is effectively forward-only (adds only).
 *  - edit/review mode: the page (Task 14) loads the existing links into
 *    `ctx.entities.serviceSubcategoryLinks` and passes them here → full reconcile.
 *
 * Returns the new link list on success; throws on any failure.
 */
export async function syncServiceSubcategories(
  serviceId: string,
  groupId: string,
  categoryId: string,
  subIds: string[],
  prevLinks: ServiceSubcategoryLink[]
): Promise<ServiceSubcategoryLink[]> {
  const noop = () => {};
  const wanted = subIds.map(String);
  const toRemove = prevLinks.filter((link) => !wanted.includes(String(link.categorySubId)));
  const toAdd = wanted.filter(
    (id) => !prevLinks.some((link) => String(link.categorySubId) === id)
  );

  let next = [...prevLinks];

  if (toRemove.length > 0) {
    const results = await Promise.all(
      toRemove.map(async (link) => {
        const response = await fetch(`/api/resources/service_categories_sub/${link.id}`, {
          method: 'DELETE',
        });
        // 404 = row already gone server-side — treat as removed.
        return { link, removed: response.ok || response.status === 404 };
      })
    );
    if (results.some((r) => !r.removed)) {
      throw new Error('Nao foi possivel atualizar as especialidades do servico.');
    }
    const removedIds = new Set(results.map((r) => r.link.id));
    next = next.filter((link) => !removedIds.has(link.id));
  }

  if (toAdd.length > 0) {
    const results = await Promise.all(
      toAdd.map((categorySubId) =>
        submitResource<
          {
            serviceId: string;
            categoryGroupId: string;
            categoryId: string;
            categorySubId: string;
          },
          {
            service_id: string;
            category_group_id: string;
            category_id: string;
            category_sub_id: string;
          },
          ServiceSubcategoryLink
        >({
          resource: 'service_categories_sub',
          values: { serviceId, categoryGroupId: groupId, categoryId, categorySubId },
          toPayload: (v) => ({
            service_id: v.serviceId,
            category_group_id: v.categoryGroupId,
            category_id: v.categoryId,
            category_sub_id: v.categorySubId,
          }),
          errorMessage: 'Nao foi possivel salvar as especialidades do servico.',
          successMessage: '',
          connectionErrorMessage: 'Nao foi possivel salvar as especialidades do servico.',
          setError: noop,
          setSuccess: noop,
        })
      )
    );
    if (results.some((r) => !r.ok || !r.data?.item)) {
      throw new Error('Nao foi possivel salvar as especialidades do servico.');
    }
    next = [...next, ...results.map((r) => r.data!.item!)];
  }

  return next;
}
