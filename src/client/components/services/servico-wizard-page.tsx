'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useResourceOptions } from '../../hooks/use-resource-options';
import { useAppPreferences } from '../../providers/app-preferences-provider';
import {
  Wizard,
  createWizardFromJson,
  type WizardConversationAdapter,
} from '../wizard';
import { SERVICE_WIZARD_STEPS } from './wizard-steps';
import { buildServiceWizardRegistry } from './wizard-steps/build-registry';
import type { PriceTableRow } from './wizard-steps/price-options';
import type { ServiceWizardJsonConfig } from './wizard-steps/wizard-config';
import type {
  ServiceWizardState,
  ServiceGroup,
  ServiceCategory,
  ServiceSubcategory,
} from './service-type';

type WizardMode = 'create' | 'edit' | 'review';

type ServicoWizardPageProps = {
  mode: WizardMode;
  serviceId: string | null;
  /** Entrada `wizards.<nome>` do `kizuna.config.json` do projeto (dado puro — cruza Server → Client). */
  wizardConfig: ServiceWizardJsonConfig;
  /**
   * Hook da Naví conversacional (só chamadores client-side; função não cruza Server → Client).
   * Só é usado em `create` e quando `wizardConfig.assistant` é `true`.
   */
  useConversation?: (groups: { id: unknown; slug?: unknown }[]) => WizardConversationAdapter;
};

type ServiceRecord = {
  id: string;
  title?: string;
  categoryGroupId?: string | null;
  categoryId?: string | null;
  description?: string;
  serviceLocation?: string | null;
  startingPrice?: number | null;
  priceUnit?: string | null;
  extras?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type ServiceSubcategoryLink = {
  id: string;
  categorySubId: string | number;
  [key: string]: unknown;
};

const EMPTY_STATE: ServiceWizardState = {
  title: '',
  groupId: '',
  categoryId: '',
  subcategoryIds: [],
  description: '',
  serviceLocation: '',
  startingPrice: 0,
  priceUnit: 'quote',
  imageIds: [],
  decision: '',
  rejectionReason: '',
  decisionNote: '',
  dynamicFormValid: true,
  addressComplete: false,
};

const ACTIVE_ONLY = { active: true } as const;

/**
 * Data-integration layer for the services wizard: loads the taxonomy + (edit/review) the
 * service record and its subcategory links, then hands everything to the core `<Wizard>`
 * engine as pure props. The `Step*` components never fetch — everything comes from here.
 * Replaces the retired `service-wizard.tsx` (1101 linhas).
 */
export function ServicoWizardPage({
  mode,
  serviceId,
  wizardConfig,
  useConversation,
}: ServicoWizardPageProps) {
  const { messages } = useAppPreferences();
  const t = messages.wizard.page;
  const { config, layoutProps, assistantEnabled } = useMemo(
    () => createWizardFromJson<ServiceWizardState>(
        wizardConfig,
        buildServiceWizardRegistry(SERVICE_WIZARD_STEPS, wizardConfig)
      ),
    [wizardConfig],
  );
  const { options: groups, loading: groupsLoading } = useResourceOptions<ServiceGroup>({
    resource: 'categories_group',
    filter: ACTIVE_ONLY,
  });
  const { options: categories, loading: categoriesLoading } = useResourceOptions<ServiceCategory>({
    resource: 'categories',
    filter: ACTIVE_ONLY,
  });
  const { options: subcategories, loading: subcategoriesLoading } =
    useResourceOptions<ServiceSubcategory>({
      resource: 'subcategories',
      filter: ACTIVE_ONLY,
    });

  const [record, setRecord] = useState<ServiceRecord | null>(null);
  const [links, setLinks] = useState<ServiceSubcategoryLink[]>([]);
  const [loadingRecord, setLoadingRecord] = useState(mode !== 'create');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (mode === 'create' || !serviceId) return;
    let active = true;

    async function load() {
      setLoadingRecord(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/resources/services/${serviceId}`, {
          cache: 'no-store',
        });
        const data =
          ((await res.json().catch(() => null)) as {
            item?: ServiceRecord;
            message?: string;
          } | null) ?? null;
        if (!active) return;
        if (!res.ok || !data?.item) {
          setLoadError(data?.message ?? t.loadError);
          return;
        }
        setRecord(data.item);

        const linksRes = await fetch(
          `/api/resources/service_categories_sub?pageSize=100&filter.service_id=${serviceId}`,
          { cache: 'no-store' },
        );
        const linksData =
          ((await linksRes.json().catch(() => null)) as {
            items?: ServiceSubcategoryLink[];
          } | null) ?? null;
        if (!active) return;
        setLinks(Array.isArray(linksData?.items) ? linksData.items : []);
      } catch {
        if (active) setLoadError(t.loadError);
      } finally {
        if (active) setLoadingRecord(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [mode, serviceId, t.loadError]);

  const entities = useMemo(
    () => ({
      groups,
      categories,
      subcategories,
      groupsLoading,
      categoriesLoading,
      subcategoriesLoading,
      serviceSubcategoryLinks: links,
    }),
    [
      groups,
      categories,
      subcategories,
      groupsLoading,
      categoriesLoading,
      subcategoriesLoading,
      links,
    ],
  );

  const initialState = useMemo<ServiceWizardState>(() => {
    if (mode === 'create' || !record) return EMPTY_STATE;
    const savedImages = record.extras?.images;
    return {
      title: record.title ?? '',
      groupId: record.categoryGroupId ?? '',
      categoryId: record.categoryId ?? '',
      subcategoryIds: links.map((link) => String(link.categorySubId)),
      description: record.description ?? '',
      serviceLocation: record.serviceLocation ?? '',
      startingPrice: record.startingPrice ?? 0,
      priceUnit: record.priceUnit ?? 'quote',
      imageIds: Array.isArray(savedImages) ? savedImages.map(String) : [],
      priceTable: Array.isArray(record.extras?.priceTable)
        ? (record.extras.priceTable as PriceTableRow[])
        : [],
      decision: '',
      rejectionReason: '',
      decisionNote: '',
      dynamicFormValid: true,
      addressComplete: true,
    };
  }, [mode, record, links]);

  // Naví conversacional é `create`-only e opt-in pelo JSON (`assistant: true`). O hook, quando
  // fornecido, roda sempre (regra de hooks) — só não é passado fora do create.
  const naviConversation = useConversation?.(
    groups.map((g) => ({ id: g.id, slug: (g as { slug?: unknown }).slug })),
  );
  const conversation = assistantEnabled && mode === 'create' ? naviConversation : undefined;

  const taxonomyLoading = groupsLoading || categoriesLoading || subcategoriesLoading;

  if (taxonomyLoading || loadingRecord) {
    return (
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-md border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t.loading}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-md border border-destructive/40 bg-destructive/5 px-3 py-3 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  return (
    <Wizard<ServiceWizardState>
      config={config}
      mode={mode}
      entities={entities}
      initialResourceId={mode === 'create' ? null : serviceId}
      editHref={(id) => `/painel/meus-servicos/${id}`}
      initialRecord={record ?? undefined}
      initialState={initialState}
      conversation={conversation}
      {...layoutProps}
    />
  );
}
