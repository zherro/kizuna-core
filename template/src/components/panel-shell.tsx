'use client';

import { useEffect, useState } from 'react';
import {
  Blocks,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FileText,
  FlaskConical,
  GitFork,
  Home,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  Megaphone,
  MessageCircleMore,
  MessageCircleWarning,
  Network,
  PlusIcon,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Tags,
  UserCircle,
} from 'lucide-react';
import { PanelShellBase, type PanelNavGroup } from '@kizuna/core/client/components/panel-shell';
import { cn } from '@kizuna/core/lib/utils';

const navigationGroups: PanelNavGroup[] = [
  {
    title: 'Navegacao',
    items: [
      { title: 'Tela inicial', href: '/', icon: Home, permResource: 'default' },
      { title: 'Painel', href: '/painel', icon: LayoutGrid, permResource: 'default' },
    ],
  },
  {
    title: 'Divulgar',
    items: [
      { title: 'Criar serviço', href: '/painel/meus-servicos/novo', icon: PlusIcon },
      { title: 'Meus serviços', href: '/painel/meus-servicos', icon: Briefcase },
    ],
  },
  {
    title: 'Minha Agenda',
    items: [
      {
        title: 'Config. agenda',
        href: '/painel/agenda/configuracao',
        icon: CalendarDays,
        permResource: 'agenda-config',
      },
      {
        title: 'Horarios',
        href: '/painel/agenda/horarios',
        icon: CalendarDays,
        permResource: 'agenda-config',
      },
      {
        title: 'Feriados & Folgas',
        href: '/painel/agenda/feriados',
        icon: CalendarDays,
        permResource: 'default',
      },
      { title: 'Agenda', href: '/painel/agenda', icon: CalendarDays, permResource: 'agenda' },
    ],
  },
  {
    title: 'Minha conta',
    items: [
      { title: 'Chat', href: '/painel/chat', icon: MessageCircleMore, permResource: 'chat' },
      { title: 'Dados do usuário', href: '/painel/minha-conta', icon: UserCircle },
      { title: 'Notificações', href: '/painel/preferencias', icon: UserCircle },
    ],
  },
  {
    title: 'Administração',
    items: [
      {
        title: 'Revisão de Anúncios',
        href: '/painel/administracao/aprovacoes',
        icon: Megaphone,
        rootOnly: true,
      },
      {
        title: 'Categorias',
        href: '/painel/taxonomia/categorias',
        icon: Tags,
        permResource: 'categorias',
      },
      {
        title: 'Subcategorias',
        href: '/painel/taxonomia/subcategorias',
        icon: GitFork,
        permResource: 'categorias',
      },
      {
        title: 'Categorias (árvore)',
        href: '/painel/taxonomia/arvore',
        icon: Network,
        permResource: 'categorias',
      },
      {
        title: 'Feriados',
        href: '/painel/administracao/feriados',
        icon: CalendarDays,
        permResource: 'feriados',
      },
      {
        title: 'Anuncios aleatorios',
        href: '/painel/administracao/anuncios-aleatorios',
        icon: Sparkles,
        permResource: 'anuncios_aleatorios',
      },
      {
        title: 'Formularios',
        href: '/painel/administracao/formularios',
        icon: ClipboardList,
        permResource: 'forms',
      },
      {
        title: 'Avaliações',
        href: '/painel/administracao/avaliacoes',
        icon: Star,
        permResource: 'reviews',
      },
      {
        title: 'Solicitações de revisão',
        href: '/painel/administracao/avaliacoes/solicitacoes',
        icon: MessageCircleWarning,
        permResource: 'reviews',
      },
      {
        title: 'Tags de avaliação',
        href: '/painel/administracao/avaliacoes/tags',
        icon: Tags,
        permResource: 'reviews',
      },
      {
        title: 'Paginas',
        href: '/painel/administracao/paginas',
        icon: FileText,
        permResource: 'pages',
      },
      {
        title: 'Acessos dos usuários',
        href: '/painel/administracao/acessos',
        icon: LockKeyhole,
        permResource: 'tenant_member',
      },
      {
        title: 'Papéis e permissões',
        href: '/painel/root/papeis',
        icon: KeyRound,
        rootOnly: true,
      },
      { title: 'Plugins instalados', href: '/painel/root/plugins', icon: Blocks, rootOnly: true },
      {
        title: 'Configurações',
        href: '/painel/root/configuracoes',
        icon: Settings,
        rootOnly: true,
      },
      {
        title: 'Log de acesso root',
        href: '/painel/security/root-access-log',
        icon: ShieldAlert,
        rootOnly: true,
      },
    ],
  },
  {
    title: 'Dev Tools',
    items: [
      {
        title: 'Teste de funcoes',
        href: '/painel/funcoes',
        icon: FlaskConical,
        permResource: 'teste_de_funcoes',
      },
    ],
  },
];

function isAdWizardRoute(pathname: string) {
  return (
    pathname === '/painel/meus-servicos/novo' ||
    /^\/painel\/meus-servicos\/[^/]+$/.test(pathname) ||
    /^\/painel\/administracao\/aprovacoes\/[^/]+$/.test(pathname)
  );
}

export function PanelShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [pendingChatCount, setPendingChatCount] = useState(0);

  useEffect(() => {
    let active = true;

    const loadChatBadge = async () => {
      try {
        const response = await fetch('/api/chat/conversations', { cache: 'no-store' });
        if (!response.ok) return;

        const data = (await response.json()) as { badgeCount?: number };
        if (active) {
          setPendingChatCount(data.badgeCount ?? 0);
        }
      } catch {
        if (active) {
          setPendingChatCount(0);
        }
      }
    };

    void loadChatBadge();

    return () => {
      active = false;
    };
  }, []);

  return (
    <PanelShellBase
      navGroups={navigationGroups}
      branding={{
        kicker: 'Foco Total',
        shortLabel: 'FT',
        fullLabel: 'Foco Total',
        menuTitle: 'Menu do painel',
        menuDescription: 'Navegue entre os modulos administrativos.',
      }}
      isFullBleedRoute={isAdWizardRoute}
      renderItemBadge={(item, collapsed) =>
        item.href === '/painel/chat' && pendingChatCount > 0 ? (
          <span
            className={cn(
              'ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-semibold text-white',
              collapsed && 'lg:hidden'
            )}
            aria-label={`${pendingChatCount} mensagens não lidas`}
            title={`${pendingChatCount} mensagens não lidas`}
          >
            {pendingChatCount}
          </span>
        ) : null
      }
    >
      {children}
    </PanelShellBase>
  );
}
