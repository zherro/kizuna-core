'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Boxes,
  CalendarClock,
  Filter,
  GalleryHorizontalEnd,
  Gauge,
  Grid2x2,
  Hash,
  Heading,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LayoutPanelTop,
  MapPin,
  MousePointerClick,
  PanelBottom,
  PanelTop,
  PictureInPicture2,
  Play,
  Radio,
  Rows3,
  Sparkles,
  SpellCheck2,
  SquareStack,
  TableProperties,
  Tags,
  ToggleLeft,
  ToggleRight,
  WifiOff,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
  DEFAULT_SHOWCASE_SECTION,
  SHOWCASE_GROUPS,
  SHOWCASE_SECTIONS,
  normalizeShowcaseSection,
  type ShowcaseSectionId,
} from './showcase-sections';

const ICON_BY_SECTION: Record<ShowcaseSectionId, React.ComponentType<{ className?: string }>> = {
  cards: LayoutDashboard,
  buttons: ToggleLeft,
  forms: Boxes,
  tables: TableProperties,
  alerts: Bell,
  progress: Gauge,
  'experience-pill': Zap,
  'bottom-progress-bar': PanelBottom,
  'mosaic-grid': LayoutGrid,
  'admin-page-reader': PanelTop,
  'bs-button': MousePointerClick,
  'toggle-row': ToggleRight,
  'channel-chip': Radio,
  'schedule-row': CalendarClock,
  'settings-section': LayoutPanelTop,
  'choice-card': SquareStack,
  'modal-panel': PictureInPicture2,
  'confirm-dialog': AlertTriangle,
  'filter-stat-card': Filter,
  'entity-list-card': Rows3,
  'media-result-card': GalleryHorizontalEnd,
  'icon-choice-grid': LayoutGrid,
  'chip-toggle-list': Tags,
  'empty-state-card': Inbox,
  'form-field': SpellCheck2,
  'number-field': Hash,
  'page-header': Heading,
  'section-illustration': Sparkles,
  'entity-grid-list': Grid2x2,
  'inline-alert': AlertCircle,
  'rpc-tester': Play,
  'pwa-register': WifiOff,
  'location-modal': MapPin,
};

type ShowcaseShellProps = {
  children: React.ReactNode;
};

function extractSection(pathname: string | null): ShowcaseSectionId {
  const value = pathname?.split('/')[2];
  if (!value) return DEFAULT_SHOWCASE_SECTION;
  const normalized = normalizeShowcaseSection(value);
  if (normalized) return normalized;
  return DEFAULT_SHOWCASE_SECTION;
}

export function ShowcaseShell({ children }: ShowcaseShellProps) {
  const pathname = usePathname();
  const activeSection = extractSection(pathname);
  const activeItem =
    SHOWCASE_SECTIONS.find((section) => section.id === activeSection) ?? SHOWCASE_SECTIONS[0];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.14),_transparent_44%),radial-gradient(circle_at_bottom_right,_hsl(var(--accent)/0.25),_transparent_48%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card/90 p-4 shadow-sm backdrop-blur lg:sticky lg:top-6">
          <div className="mb-4 border-b border-border pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Showcase
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              Componentes
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Subpaginas independentes para navegar e validar os blocos de interface.
            </p>
          </div>

          <nav className="space-y-4">
            {SHOWCASE_GROUPS.map((group) => {
              const groupSections = SHOWCASE_SECTIONS.filter(
                (section) => section.groupId === group.id
              );
              return (
                <div className="space-y-1" key={group.id}>
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </p>
                  {groupSections.map((section) => {
                    const isActive = section.id === activeSection;
                    const Icon = ICON_BY_SECTION[section.id];
                    return (
                      <Link
                        className={cn(
                          'ml-2 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                          isActive
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground'
                        )}
                        href={`/showcase/${section.id}`}
                        key={section.id}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{section.label}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          <div className="mt-4 rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Secao ativa
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{activeItem.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{activeItem.description}</p>
          </div>
        </aside>

        <section className="space-y-6">{children}</section>
      </div>
    </div>
  );
}
