'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  CalendarOff,
  Check,
  Copy,
  MapPin,
  Palmtree,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Utensils,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ExperiencePill } from '../ui-better-soft/experience-pill';
import { FixedBottomProgress } from '../ui-better-soft/fixed-bottom-progress';
import { MosaicGrid, type MosaicGridItem } from '../ui-better-soft/mosaic-grid';
import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import { PageHeader } from '../ui-better-soft/headers/page-header';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ToggleRow } from '../ui-better-soft/toggle-row';
import { ChannelChip } from '../ui-better-soft/channel-chip';
import { ScheduleRow } from '../ui-better-soft/schedule-row';
import { Section } from '../ui-better-soft/section';
import { ChoiceCard } from '../ui-better-soft/choice-card';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';
import { FilterStatCard } from '../ui-better-soft/lists/filter-stat-card';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';
import { MediaResultCard } from '../ui-better-soft/lists/media-result-card';
import { IconChoiceGrid } from '../ui-better-soft/lists/icon-choice-grid';
import { ChipToggleList } from '../ui-better-soft/lists/chip-toggle-list';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';
import { FormField } from '../ui-better-soft/forms/form-field';
import { NumberField } from '../ui-better-soft/forms/number-field';
import { SectionIllustration } from '../ui-better-soft/section-illustration';
import { EntityGridList } from '../ui-better-soft/lists/entity-grid-list';
import { InlineAlert } from '../ui-better-soft/inline-alert';
import {
  SystemConfigSection,
  type SystemConfigFieldSpec,
} from '../ui-better-soft/system-config-section';
import { RpcTester } from '../rpc-tester';
import { LocationTrigger, LocationModal } from '../location-modal';
import { useForm } from '@kizuna/core';
import * as Yup from 'yup';
import { getShowcaseSection, type ShowcaseSectionId } from './showcase-sections';

type ShowcaseSectionPageProps = {
  sectionId: ShowcaseSectionId;
};

function CodeUsage({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Codigo de uso</CardTitle>
          <CardDescription>Copie e cole para reutilizar o componente.</CardDescription>
        </div>
        <Button onClick={handleCopy} size="sm" type="button" variant="outline">
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground sm:text-sm">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

function CardsDemo() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Assinaturas</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">428</p>
        <p className="mt-1 text-sm text-muted-foreground">+16% em 30 dias</p>
      </div>
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Atendimentos</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">1.204</p>
        <p className="mt-1 text-sm text-muted-foreground">Tempo medio: 3m 20s</p>
      </div>
      <div className="rounded-xl border border-border bg-background p-4">
        <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Conversao</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">8.7%</p>
        <p className="mt-1 text-sm text-muted-foreground">Melhor semana do trimestre</p>
      </div>
    </div>
  );
}

function ButtonsDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button>Primario</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Pequeno</Button>
      <Button size="lg">Grande</Button>
      <Button disabled>Desabilitado</Button>
    </div>
  );
}

function FormsDemo() {
  return (
    <form className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="nome-showcase">
          Nome
        </label>
        <Input id="nome-showcase" placeholder="Digite o nome" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="email-showcase">
          Email
        </label>
        <Input id="email-showcase" placeholder="nome@empresa.com" type="email" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label className="text-sm font-medium text-foreground" htmlFor="assunto-showcase">
          Assunto
        </label>
        <Input id="assunto-showcase" placeholder="Tema da solicitacao" />
      </div>
      <div className="md:col-span-2">
        <Button type="button">Salvar alteracoes</Button>
      </div>
    </form>
  );
}

function TablesDemo() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tarefa</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Responsavel</TableHead>
          <TableHead>Prazo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Revisar onboarding</TableCell>
          <TableCell>Em andamento</TableCell>
          <TableCell>Beatriz</TableCell>
          <TableCell>22/05</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Atualizar banner</TableCell>
          <TableCell>Concluido</TableCell>
          <TableCell>Rafael</TableCell>
          <TableCell>20/05</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Melhorar filtros</TableCell>
          <TableCell>Bloqueado</TableCell>
          <TableCell>Camila</TableCell>
          <TableCell>24/05</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function AlertsDemo() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        Operacao concluida com sucesso.
      </div>
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
        Revisao recomendada antes de publicar.
      </div>
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
        Falha ao sincronizar dados. Tente novamente.
      </div>
    </div>
  );
}

function ProgressDemo() {
  const [value, setValue] = useState(52);

  return (
    <div className="space-y-4">
      <Progress value={value} className="h-2.5" />

      <div className="flex flex-wrap gap-2">
        {[15, 40, 65, 90].map((item) => (
          <Button
            key={item}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValue(item)}
          >
            {item}%
          </Button>
        ))}
      </div>
    </div>
  );
}

function UiBetterSoftDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ExperiencePill />
      <ExperiencePill text="Publicacao em menos de 2 minutos" />
    </div>
  );
}

const MOSAIC_DEMO_ITEMS: MosaicGridItem[] = [
  {
    id: 'lanches',
    label: 'Lanches',
    hint: 'Fast food e combos',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
    span: 'large',
  },
  {
    id: 'mercado',
    label: 'Mercado',
    hint: 'Compras do dia',
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    hint: 'Geladas e destilados',
    image:
      'https://images.unsplash.com/photo-1514361892635-eae31ec92f67?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'servicos',
    label: 'Servicos',
    hint: 'Profissionais perto de voce',
    image:
      'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1000&q=80',
    span: 'wide',
  },
  {
    id: 'eletronicos',
    label: 'Eletronicos',
    hint: 'Ofertas e usados premium',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
  },
];

function MosaicGridDemo() {
  return <MosaicGrid items={MOSAIC_DEMO_ITEMS} />;
}

function BottomProgressBarDemo() {
  const [currentStep, setCurrentStep] = useState(2);
  const steps = [
    { id: 1, label: 'Categoria' },
    { id: 2, label: 'Detalhes' },
    { id: 3, label: 'Imagens' },
    { id: 4, label: 'Revisao' },
  ];

  return (
    <div className="space-y-4">
      <FixedBottomProgress fixed={false} steps={steps} value={currentStep} />

      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <Button
            key={step.id}
            type="button"
            size="sm"
            variant={currentStep === step.id ? 'default' : 'outline'}
            onClick={() => setCurrentStep(step.id)}
          >
            {step.label}
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Etapa atual: <span className="font-medium text-foreground">{currentStep}</span>
      </p>
    </div>
  );
}

function AdminPageReaderDemo() {
  return (
    <AdminPageReader
      title="Preferencias"
      description="Diga como voce quer receber pedidos e quando esta disponivel para atender."
      backHref="/showcase/admin-page-reader"
      backLabel="Ir ao painel"
      actions={
        <>
          <BsButton variant="outline" label="Restaurar padrao" />
          <BsButton variant="default" label="Salvar" icon={Save} />
        </>
      }
      className="mb-0 rounded-xl border border-border bg-background p-4"
    />
  );
}

function PageHeaderDemo() {
  return (
    <PageHeader
      eyebrow="Meus serviços"
      title="Gerenciar serviços"
      description="Crie serviços em etapas e continue a edição quando precisar."
      actions={
        <>
          <Link href="/painel" className={buttonVariants({ variant: 'outline' })}>
            Voltar ao painel
          </Link>
          <Link href="/painel/meus-servicos/novo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Novo serviço
          </Link>
        </>
      }
    />
  );
}

function BsButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <BsButton variant="outline" label="Restaurar padrao" />
      <BsButton variant="default" label="Salvar" icon={Save} />
    </div>
  );
}

function ToggleRowDemo() {
  const [newDemands, setNewDemands] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="space-y-3">
      <ToggleRow
        title="Novas demandas de clientes"
        subtitle="Avisar quando aparecer uma demanda que combina com seus servicos."
        checked={newDemands}
        onChange={setNewDemands}
      />
      <ToggleRow
        title="Novidades e dicas"
        subtitle="Recadinhos ocasionais sobre a plataforma."
        checked={marketing}
        onChange={setMarketing}
      />
    </div>
  );
}

function ChannelChipDemo() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <ChannelChip label="E-mail" checked={email} onChange={setEmail} />
      <ChannelChip label="Push no app" checked={push} onChange={setPush} />
      <ChannelChip label="WhatsApp" checked={whatsapp} onChange={setWhatsapp} />
    </div>
  );
}

function ScheduleRowDemo() {
  const [monday, setMonday] = useState({ enabled: true, start: '08:00', end: '18:00' });
  const [lunch, setLunch] = useState({ enabled: true, start: '12:00', end: '13:00' });

  return (
    <div className="space-y-2">
      <ScheduleRow
        label="Segunda"
        enabled={monday.enabled}
        onEnabledChange={(enabled) => setMonday((current) => ({ ...current, enabled }))}
        start={monday.start}
        end={monday.end}
        onStartChange={(start) => setMonday((current) => ({ ...current, start }))}
        onEndChange={(end) => setMonday((current) => ({ ...current, end }))}
      />
      <ScheduleRow
        label="Almoco"
        icon={Utensils}
        description="Horario de pausa aplicado em todos os dias de atendimento."
        enabled={lunch.enabled}
        onEnabledChange={(enabled) => setLunch((current) => ({ ...current, enabled }))}
        start={lunch.start}
        end={lunch.end}
        onStartChange={(start) => setLunch((current) => ({ ...current, start }))}
        onEndChange={(end) => setLunch((current) => ({ ...current, end }))}
      />
    </div>
  );
}

function SettingsSectionDemo() {
  return (
    <Section
      icon={<Bell className="h-4 w-4" />}
      title="Notificacoes"
      description="Escolha o que voce quer receber e por onde."
    >
      <p className="text-sm text-muted-foreground">Conteudo da secao vai aqui.</p>
    </Section>
  );
}

function ChoiceCardDemo() {
  const [clientPicks, setClientPicks] = useState(true);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ChoiceCard
        selected={clientPicks}
        onSelect={() => setClientPicks(true)}
        title="O cliente escolhe"
        description="O cliente ve os horarios livres e ja escolhe dia e hora."
        badge="Mais rapido"
      />
      <ChoiceCard
        selected={!clientPicks}
        onSelect={() => setClientPicks(false)}
        title="Eu escolho ao fechar"
        description="Voce combina o horario ao confirmar o pedido."
        badge="Mais controle"
      />
    </div>
  );
}

function ModalPanelDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <BsButton label="Nova folga" onClick={() => setOpen(true)} />

      <ModalPanel
        open={open}
        onClose={() => setOpen(false)}
        icon={<Palmtree className="h-4 w-4 text-brand" />}
        title="Nova folga"
        description="Bloqueie a data para nao receber novos agendamentos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <BsButton label="Salvar" onClick={() => setOpen(false)} />
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Conteudo do formulario aqui.</p>
      </ModalPanel>
    </>
  );
}

function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" className="text-destructive" onClick={() => setOpen(true)}>
        Remover
      </Button>

      <ConfirmDialog
        open={open}
        title="Remover folga?"
        description="Essa acao nao pode ser desfeita."
        confirmLabel="Remover"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

function FilterStatCardDemo() {
  const [filter, setFilter] = useState<'todas' | 'ativas'>('todas');

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <FilterStatCard
        label="Em andamento"
        value={3}
        tone="success"
        active={filter === 'ativas'}
        onClick={() => setFilter(filter === 'ativas' ? 'todas' : 'ativas')}
      />
      <FilterStatCard label="Agendadas" value={2} tone="info" active={false} onClick={() => {}} />
      <FilterStatCard
        label="Desativadas"
        value={1}
        tone="muted"
        active={false}
        onClick={() => {}}
      />
      <FilterStatCard label="Encerradas" value={5} tone="muted" active={false} onClick={() => {}} />
    </div>
  );
}

function EntityListCardDemo() {
  return (
    <ul className="space-y-3">
      <EntityListCard
        leading={
          <div>
            <span className="text-sm font-semibold">Ferias</span>
            <Badge variant="outline" className="ml-2 text-[11px]">
              Agendada
            </Badge>
            <p className="mt-1.5 text-sm text-muted-foreground">10 jan — 20 jan</p>
          </div>
        }
        trailing={
          <div className="flex gap-1">
            <Button variant="ghost" size="sm">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />
    </ul>
  );
}

function MediaResultCardDemo() {
  return (
    <div className="max-w-xs">
      <MediaResultCard
        image="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80"
        imageAlt="Instalacao eletrica residencial"
        badgeTopLeft={
          <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
            <Sparkles className="h-3 w-3" /> Patrocinado
          </Badge>
        }
        badgeTopRight={
          <Badge variant="secondary" className="bg-background/90 text-foreground shadow">
            Eletricista
          </Badge>
        }
        title="Instalacao eletrica residencial"
        subtitle="Reparos e instalacoes"
        leading={
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2 py-1.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              JS
            </span>
            <span className="flex-1 truncate text-[11px] font-semibold text-foreground">
              @joao_silva
            </span>
          </div>
        }
        footer={
          <>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                a partir de
              </div>
              <div className="text-lg font-black leading-none">R$ 120,00</div>
            </div>
            <a
              href="#"
              className={buttonVariants({
                size: 'sm',
                className: 'shrink-0 gap-2 text-xs',
              })}
            >
              Ver servico
            </a>
          </>
        }
      />
    </div>
  );
}

function IconChoiceGridDemo() {
  const [value, setValue] = useState<string>('1');

  return (
    <IconChoiceGrid
      items={[
        {
          id: '1',
          icon: <Sparkles className="h-5 w-5" />,
          title: 'Eletrica',
          description: 'Instalacoes e reparos residenciais',
        },
        {
          id: '2',
          icon: <Sparkles className="h-5 w-5" />,
          title: 'Hidraulica',
          description: 'Encanamento e vazamentos',
        },
        {
          id: '3',
          icon: <Sparkles className="h-5 w-5" />,
          title: 'Pintura',
          description: 'Residencial e comercial',
        },
      ]}
      value={value}
      onChange={setValue}
      accent="brand"
    />
  );
}

function ChipToggleListDemo() {
  const [value, setValue] = useState<string[]>(['1']);

  return (
    <ChipToggleList
      options={[
        { id: '1', label: 'Residencial' },
        { id: '2', label: 'Comercial' },
        { id: '3', label: 'Emergencia 24h' },
      ]}
      value={value}
      onChange={setValue}
      accent="brand"
    />
  );
}

function EmptyStateCardDemo() {
  return (
    <EmptyStateCard
      icon={CalendarOff}
      title="Nenhuma folga cadastrada"
      description="Cadastre datas em que voce nao vai atender para bloquear novos agendamentos."
      action={<BsButton label="Nova folga" icon={Plus} onClick={() => {}} />}
    />
  );
}

type FormFieldDemoValues = {
  name: string;
  date: string;
  recurring: boolean;
  description: string;
};

function FormFieldDemo() {
  const form = useForm<FormFieldDemoValues>({
    initialValues: { name: '', date: '', recurring: false, description: '' },
    validationSchema: Yup.object({
      name: Yup.string().trim().required('Informe o nome.'),
      date: Yup.string().trim().required('Informe a data.'),
    }),
    onSubmit: async () => {
      // demo only — a real page would call resource.saveOne(values) here
    },
  });

  return (
    <div className="space-y-4">
      <FormField
        formik={form.formik}
        field="name"
        label="Nome"
        placeholder="Ex.: Folga de aniversario"
      />
      <FormField formik={form.formik} field="date" label="Data" type="date" />
      <FormField
        formik={form.formik}
        field="recurring"
        as="switch"
        label="Recorrente"
        description="Repete todo ano nesta data."
      />
      <FormField
        formik={form.formik}
        field="description"
        as="textarea"
        label="Observacao"
        rows={3}
      />
      <BsButton label="Validar" onClick={() => void form.formik.submitForm()} />
    </div>
  );
}

function NumberFieldDemo() {
  const [radiusKm, setRadiusKm] = useState(10);

  return (
    <div className="max-w-xs">
      <NumberField
        label="Raio de atendimento"
        icon={MapPin}
        suffix="km"
        hint="Distancia maxima que voce aceita se deslocar."
        value={radiusKm}
        min={1}
        max={200}
        onChange={setRadiusKm}
      />
    </div>
  );
}

function SectionIllustrationDemo() {
  return (
    <div className="space-y-4">
      <SectionIllustration sceneKey="meus-servicos" />
      <SectionIllustration
        scene={{
          message: 'Configure sua agenda de atendimento',
          character: 'old-lady',
          accessories: [{ key: 'calendar', x: -30, y: 6 }],
        }}
      />
    </div>
  );
}

type EntityGridDemoItem = { id: string; title: string; subtitle: string };

const ENTITY_GRID_DEMO_ITEMS: EntityGridDemoItem[] = [
  { id: '1', title: 'Pintura residencial', subtitle: 'A partir de R$ 250' },
  { id: '2', title: 'Instalacao eletrica', subtitle: 'A partir de R$ 180' },
];

function EntityGridListDemo() {
  return (
    <EntityGridList
      title="Seus itens"
      items={ENTITY_GRID_DEMO_ITEMS}
      getKey={(item) => item.id}
      storageKey="showcase-entity-grid-demo"
      renderCard={(item) => (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
        </div>
      )}
      renderRow={(item) => (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          <div>
            <p className="text-sm font-semibold text-foreground">{item.title}</p>
            <p className="text-xs text-muted-foreground">{item.subtitle}</p>
          </div>
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      emptyState={<p className="text-sm text-muted-foreground">Nenhum item ainda.</p>}
    />
  );
}

function InlineAlertDemo() {
  return (
    <div className="space-y-3">
      <InlineAlert type="error" text="Não foi possível carregar os dados. Tente novamente." />
      <InlineAlert type="success" text="Alterações salvas com sucesso." />
    </div>
  );
}

function RpcTesterDemo() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <RpcTester eyebrow="Showcase" title="Teste de funcoes RPC" />
    </div>
  );
}

function PwaRegisterDemo() {
  // Sem preview ao vivo de proposito: montar <PwaRegister /> registraria um service worker
  // de verdade nesta pagina do showcase, que nao e o app que o consome.
  return (
    <p className="text-sm text-muted-foreground">
      Componente sem UI (retorna <code className="text-foreground">null</code>) — nao tem preview
      visual. Veja o codigo de uso abaixo.
    </p>
  );
}

function LocationModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3">
      <LocationTrigger onClick={() => setOpen(true)} />
      <LocationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

const SYSTEM_CONFIG_DEMO_FIELDS: SystemConfigFieldSpec[] = [
  { type: 'toggle', key: 'visible', title: 'Exibir campo' },
  {
    type: 'toggle',
    key: 'required',
    title: 'Obrigatorio',
    disabledWhen: (value) => !value.visible,
  },
  {
    type: 'select',
    key: 'mask',
    label: 'Tipo de documento',
    options: [
      { value: 'cpf_cnpj', label: 'CPF ou CNPJ' },
      { value: 'cpf', label: 'Somente CPF' },
    ],
    disabledWhen: (value) => !value.visible,
  },
];

function SystemConfigSectionDemo() {
  return (
    <SystemConfigSection
      configKey="showcase.demo_field"
      title="Campo de documento"
      description="Demo — este card não salva de verdade nesta página."
      fields={SYSTEM_CONFIG_DEMO_FIELDS}
      initialValue={{ visible: true, required: false, mask: 'cpf_cnpj' }}
    />
  );
}

function SectionDemo({ sectionId }: { sectionId: ShowcaseSectionId }) {
  if (sectionId === 'cards') return <CardsDemo />;
  if (sectionId === 'buttons') return <ButtonsDemo />;
  if (sectionId === 'forms') return <FormsDemo />;
  if (sectionId === 'tables') return <TablesDemo />;
  if (sectionId === 'alerts') return <AlertsDemo />;
  if (sectionId === 'progress') return <ProgressDemo />;
  if (sectionId === 'bottom-progress-bar') return <BottomProgressBarDemo />;
  if (sectionId === 'mosaic-grid') return <MosaicGridDemo />;
  if (sectionId === 'admin-page-reader') return <AdminPageReaderDemo />;
  if (sectionId === 'page-header') return <PageHeaderDemo />;
  if (sectionId === 'bs-button') return <BsButtonDemo />;
  if (sectionId === 'toggle-row') return <ToggleRowDemo />;
  if (sectionId === 'channel-chip') return <ChannelChipDemo />;
  if (sectionId === 'schedule-row') return <ScheduleRowDemo />;
  if (sectionId === 'settings-section') return <SettingsSectionDemo />;
  if (sectionId === 'choice-card') return <ChoiceCardDemo />;
  if (sectionId === 'modal-panel') return <ModalPanelDemo />;
  if (sectionId === 'confirm-dialog') return <ConfirmDialogDemo />;
  if (sectionId === 'filter-stat-card') return <FilterStatCardDemo />;
  if (sectionId === 'entity-list-card') return <EntityListCardDemo />;
  if (sectionId === 'media-result-card') return <MediaResultCardDemo />;
  if (sectionId === 'icon-choice-grid') return <IconChoiceGridDemo />;
  if (sectionId === 'chip-toggle-list') return <ChipToggleListDemo />;
  if (sectionId === 'empty-state-card') return <EmptyStateCardDemo />;
  if (sectionId === 'form-field') return <FormFieldDemo />;
  if (sectionId === 'number-field') return <NumberFieldDemo />;
  if (sectionId === 'section-illustration') return <SectionIllustrationDemo />;
  if (sectionId === 'entity-grid-list') return <EntityGridListDemo />;
  if (sectionId === 'inline-alert') return <InlineAlertDemo />;
  if (sectionId === 'rpc-tester') return <RpcTesterDemo />;
  if (sectionId === 'pwa-register') return <PwaRegisterDemo />;
  if (sectionId === 'location-modal') return <LocationModalDemo />;
  return <UiBetterSoftDemo />;
}

export function ShowcaseSectionPage({ sectionId }: ShowcaseSectionPageProps) {
  const section = getShowcaseSection(sectionId);

  return (
    <>
      <Card className="border-primary/20 bg-card/90">
        <CardHeader>
          <CardTitle>{section.label}</CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <CardDescription>Visualizacao real do componente em uso.</CardDescription>
        </CardHeader>
        <CardContent>
          <SectionDemo sectionId={sectionId} />
        </CardContent>
      </Card>

      <CodeUsage code={section.usageCode} />
    </>
  );
}
