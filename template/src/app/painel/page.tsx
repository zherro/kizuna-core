import Link from 'next/link';
import {
  CalendarDays,
  FlaskConical,
  FolderTree,
  GitFork,
  Layers3,
  Megaphone,
  SquareChartGantt,
} from 'lucide-react';
import { buttonVariants } from '@kizuna/core/client/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kizuna/core/client/components/ui/card';
import { getSession } from '@kizuna/core/server';
import { PainelWrapper } from '@/components/painel-wrapper';

const cards = [
  {
    title: 'Categorias',
    description: 'Organize os tipos de servico e mantenha o cadastro centralizado.',
    href: '/painel/taxonomia/categorias',
    icon: FolderTree,
    adminOnly: true,
  },
  {
    title: 'Subcategorias',
    description: 'Cadastre subcategorias e vincule cada item a uma categoria principal.',
    href: '/painel/taxonomia/subcategorias',
    icon: GitFork,
    adminOnly: true,
  },
  {
    title: 'Teste de funcoes',
    description: 'Execute RPCs no PostgREST com o token da sessao para validar RLS e retorno.',
    href: '/painel/funcoes',
    icon: FlaskConical,
  },
  {
    title: 'Meus anúncios',
    description: 'Crie e gerencie seus anúncios com fluxo em etapas.',
    href: '/painel/meus-anuncios',
    icon: Megaphone,
  },
  {
    title: 'Agenda',
    description: 'Planeje compromissos em visoes de mes, semana, dia e lista.',
    href: '/painel/agenda',
    icon: CalendarDays,
  },
  {
    title: 'Servicos',
    description: 'Proxima etapa: conectar o cadastro completo de servicos ao backend real.',
    href: '#',
    icon: Layers3,
  },
  {
    title: 'Operacao',
    description: 'Use o painel para estruturar o fluxo administrativo da plataforma.',
    href: '#',
    icon: SquareChartGantt,
  },
];

export default async function PainelPage() {
  const session = await getSession();
  const canManageCatalog = (session?.tenant_type ?? '').toUpperCase() === 'ADMIN';
  const isUserType = (session?.tenant_type ?? '').toUpperCase() === 'USER';
  const visibleCards = cards.filter((card) => !card.adminOnly || canManageCatalog);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:px-6">
      {/* Onboarding Banner for USER type */}
      {isUserType && session?.user_id && (
        <PainelWrapper userId={session.user_id} role="advertiser" />
      )}

      <section className="rounded-3xl border border-border bg-card px-6 py-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">Meu painel</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Bem-vindo ao painel da operacao
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          A partir daqui voce administra o cadastro base da plataforma. Ja deixei a primeira area
          pronta com CRUD padrao de categorias integrado a API do Next.
        </p>
        <div className="mt-5 flex gap-3">
          {canManageCatalog ? (
            <Link href="/painel/taxonomia/categorias" className={buttonVariants()}>
              Gerenciar categorias
            </Link>
          ) : null}
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Ver site
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {visibleCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-3 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {card.href === '#' ? (
                  <p className="text-sm text-muted-foreground">Disponivel nas proximas etapas.</p>
                ) : (
                  <Link href={card.href} className={buttonVariants({ variant: 'outline' })}>
                    Abrir modulo
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
