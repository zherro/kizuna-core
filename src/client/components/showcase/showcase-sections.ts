export type ShowcaseSectionId =
  | 'cards'
  | 'buttons'
  | 'forms'
  | 'tables'
  | 'alerts'
  | 'progress'
  | 'experience-pill'
  | 'bottom-progress-bar'
  | 'mosaic-grid'
  | 'admin-page-reader'
  | 'page-header'
  | 'bs-button'
  | 'toggle-row'
  | 'channel-chip'
  | 'schedule-row'
  | 'settings-section'
  | 'choice-card'
  | 'modal-panel'
  | 'confirm-dialog'
  | 'filter-stat-card'
  | 'entity-list-card'
  | 'media-result-card'
  | 'icon-choice-grid'
  | 'chip-toggle-list'
  | 'empty-state-card'
  | 'form-field'
  | 'number-field'
  | 'section-illustration'
  | 'entity-grid-list'
  | 'inline-alert'
  | 'rpc-tester'
  | 'pwa-register'
  | 'location-modal'
  | 'system-config-section';

export type ShowcaseGroupId = 'shadcn-default' | 'ui-better-soft';

export type ShowcaseSection = {
  id: ShowcaseSectionId;
  groupId: ShowcaseGroupId;
  label: string;
  description: string;
  usageCode: string;
};

export type ShowcaseGroup = {
  id: ShowcaseGroupId;
  label: string;
};

export const SHOWCASE_GROUPS: ShowcaseGroup[] = [
  { id: 'shadcn-default', label: 'Shadcn Default' },
  { id: 'ui-better-soft', label: 'ui-better-soft' },
];

export const SHOWCASE_SECTIONS: ShowcaseSection[] = [
  {
    id: 'cards',
    groupId: 'shadcn-default',
    label: 'Cards',
    description: 'Blocos para resumos e destaque de informacoes.',
    usageCode: `import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function DashboardSummary() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinaturas</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">428</p>
      </CardContent>
    </Card>
  );
}`,
  },
  {
    id: 'buttons',
    groupId: 'shadcn-default',
    label: 'Botoes',
    description: 'Variantes de acao primaria, secundarias e discretas.',
    usageCode: `import { Button } from '../ui/button';

export function Actions() {
  return (
    <div className="flex gap-2">
      <Button>Salvar</Button>
      <Button variant="outline">Cancelar</Button>
      <Button variant="ghost">Mais opcoes</Button>
    </div>
  );
}`,
  },
  {
    id: 'forms',
    groupId: 'shadcn-default',
    label: 'Formularios',
    description: 'Entradas de dados com foco em clareza e ritmo visual.',
    usageCode: `import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function ContactForm() {
  return (
    <form className="grid gap-3 md:grid-cols-2">
      <Input placeholder="Nome" />
      <Input type="email" placeholder="Email" />
      <div className="md:col-span-2">
        <Button type="submit">Enviar</Button>
      </div>
    </form>
  );
}`,
  },
  {
    id: 'tables',
    groupId: 'shadcn-default',
    label: 'Tabelas',
    description: 'Visualizacao de listagens com leitura rapida.',
    usageCode: `import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function TasksTable() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tarefa</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Revisar onboarding</TableCell>
          <TableCell>Em andamento</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}`,
  },
  {
    id: 'alerts',
    groupId: 'shadcn-default',
    label: 'Alertas',
    description: 'Estados de feedback para sucesso, aviso e erro.',
    usageCode: `export function StatusAlerts() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
        Operacao concluida com sucesso.
      </div>
      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
        Falha ao sincronizar dados.
      </div>
    </div>
  );
}`,
  },
  {
    id: 'progress',
    groupId: 'shadcn-default',
    label: 'Progress',
    description: 'Componente shadcn para barra de progresso com transicao suave.',
    usageCode: `import { Progress } from '../ui/progress';

export function ProgressSample() {
  return <Progress value={64} className="h-2.5" />;
}`,
  },
  {
    id: 'experience-pill',
    groupId: 'ui-better-soft',
    label: 'Experience Pill',
    description: 'Selo reutilizavel com icone e destaque suave para mensagens curtas.',
    usageCode: `import { ExperiencePill } from '../ui-better-soft/experience-pill';

export function HeroHighlight() {
  return <ExperiencePill text="Experiencia rapida para comprar e vender local" />;
}`,
  },
  {
    id: 'bottom-progress-bar',
    groupId: 'ui-better-soft',
    label: 'Bottom Progress Bar',
    description: 'Barra fixa inferior que acompanha o progresso por etapa.',
    usageCode: `import { useState } from 'react';
import { FixedBottomProgress } from '../ui-better-soft/fixed-bottom-progress';

const steps = [
  { id: 1, label: 'Categoria' },
  { id: 2, label: 'Detalhes' },
  { id: 3, label: 'Imagens' },
  { id: 4, label: 'Revisao' },
];

export function BottomProgressExample() {
  const [currentStep, setCurrentStep] = useState(1);

  return <FixedBottomProgress steps={steps} value={currentStep} onValueChange={setCurrentStep} />;
}`,
  },
  {
    id: 'mosaic-grid',
    groupId: 'ui-better-soft',
    label: 'Mosaic Grid',
    description: 'Mosaico reaproveitavel para destacar categorias e colecoes visuais.',
    usageCode: `import { MosaicGrid, type MosaicGridItem } from '../ui-better-soft/mosaic-grid';

const mosaicItems: MosaicGridItem[] = [
  {
    id: 'lanches',
    label: 'Lanches',
    hint: 'Fast food e combos',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=80',
    span: 'large',
  },
  {
    id: 'mercado',
    label: 'Mercado',
    hint: 'Compras do dia',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'bebidas',
    label: 'Bebidas',
    hint: 'Geladas e destilados',
    image: 'https://images.unsplash.com/photo-1514361892635-eae31ec92f67?auto=format&fit=crop&w=1000&q=80',
  },
  {
    id: 'servicos',
    label: 'Servicos',
    hint: 'Profissionais perto de voce',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1000&q=80',
    span: 'wide',
  },
  {
    id: 'eletronicos',
    label: 'Eletronicos',
    hint: 'Ofertas e usados premium',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=80',
  },
];

export function MosaicGridExactPreview() {
  return <MosaicGrid items={mosaicItems} />;
}`,
  },
  {
    id: 'admin-page-reader',
    groupId: 'ui-better-soft',
    label: 'Admin Page Reader',
    description: 'Cabecalho de pagina administrativa com link de volta, titulo, descricao e acoes.',
    usageCode: `import { Save } from 'lucide-react';
import { AdminPageReader } from '../ui-better-soft/headers/admin-page-reader';
import { BsButton } from '../ui-better-soft/buttons/bs-button';

export function PreferenciasHeader() {
  return (
    <AdminPageReader
      title="Preferencias"
      description="Diga como voce quer receber pedidos e quando esta disponivel para atender."
      backHref="/painel"
      actions={
        <>
          <BsButton variant="outline" label="Restaurar padrao" onClick={() => {}} />
          <BsButton variant="default" label="Salvar" icon={Save} onClick={() => {}} />
        </>
      }
    />
  );
}`,
  },
  {
    id: 'page-header',
    groupId: 'ui-better-soft',
    label: 'Page Header',
    description:
      'Cabecalho de pagina de listagem/gestao: eyebrow + titulo + descricao a esquerda, acoes (voltar, nova acao...) a direita. Empilha no mobile.',
    usageCode: `import Link from 'next/link';
import { Plus } from 'lucide-react';
import { buttonVariants } from '../ui/button';
import { PageHeader } from '../ui-better-soft/headers/page-header';

export function ServicosHeader() {
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
}`,
  },
  {
    id: 'bs-button',
    groupId: 'ui-better-soft',
    label: 'BS Button',
    description:
      'Botao com estilos fixos (sem className) e icone opcional. Variantes: default e outline.',
    usageCode: `import { Save } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';

export function FormActions() {
  return (
    <div className="flex gap-2">
      <BsButton variant="outline" label="Restaurar padrao" onClick={() => {}} />
      <BsButton variant="default" label="Salvar" icon={Save} onClick={() => {}} />
    </div>
  );
}`,
  },
  {
    id: 'toggle-row',
    groupId: 'ui-better-soft',
    label: 'Toggle Row',
    description: 'Linha com titulo, subtitulo opcional e um switch alinhado a direita.',
    usageCode: `import { useState } from 'react';
import { ToggleRow } from '../ui-better-soft/toggle-row';

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(true);

  return (
    <ToggleRow
      title="Novas demandas de clientes"
      subtitle="Avisar quando aparecer uma demanda que combina com seus servicos."
      checked={enabled}
      onChange={setEnabled}
    />
  );
}`,
  },
  {
    id: 'channel-chip',
    groupId: 'ui-better-soft',
    label: 'Channel Chip',
    description: 'Chip clicavel para alternar um canal ligado/desligado.',
    usageCode: `import { useState } from 'react';
import { ChannelChip } from '../ui-better-soft/channel-chip';

export function ChannelPicker() {
  const [email, setEmail] = useState(true);

  return <ChannelChip label="E-mail" checked={email} onChange={setEmail} />;
}`,
  },
  {
    id: 'schedule-row',
    groupId: 'ui-better-soft',
    label: 'Schedule Row',
    description:
      'Linha com switch, rotulo e intervalo de horario (inicio/fim). Usado para dias da semana e pausas.',
    usageCode: `import { useState } from 'react';
import { Utensils } from 'lucide-react';
import { ScheduleRow } from '../ui-better-soft/schedule-row';

export function LunchBreakField() {
  const [lunch, setLunch] = useState({ enabled: true, start: '12:00', end: '13:00' });

  return (
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
  );
}`,
  },
  {
    id: 'settings-section',
    groupId: 'ui-better-soft',
    label: 'Settings Section',
    description:
      'Bloco com icone, titulo, descricao e conteudo. Agrupa controles de uma pagina de configuracoes.',
    usageCode: `import { Bell } from 'lucide-react';
import { Section } from '../ui-better-soft/section';

export function NotificationsBlock() {
  return (
    <Section
      icon={<Bell className="h-4 w-4" />}
      title="Notificacoes"
      description="Escolha o que voce quer receber e por onde."
    >
      {/* controles aqui */}
    </Section>
  );
}`,
  },
  {
    id: 'choice-card',
    groupId: 'ui-better-soft',
    label: 'Choice Card',
    description: 'Cartao selecionavel com titulo, descricao e badge opcional.',
    usageCode: `import { useState } from 'react';
import { ChoiceCard } from '../ui-better-soft/choice-card';

export function SchedulePreferencePicker() {
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
}`,
  },
  {
    id: 'modal-panel',
    groupId: 'ui-better-soft',
    label: 'Modal Panel',
    description:
      'Painel lateral que desliza da direita (mesmo formato do Sheet usado em formularios de criar/editar), com icone, titulo, descricao, conteudo e rodape de acoes.',
    usageCode: `import { useState } from 'react';
import { Palmtree } from 'lucide-react';
import { Button } from '../ui/button';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { ModalPanel } from '../ui-better-soft/overlay/modal-panel';

export function NewItemModal() {
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
}`,
  },
  {
    id: 'confirm-dialog',
    groupId: 'ui-better-soft',
    label: 'Confirm Dialog',
    description: 'Dialogo de confirmacao para acoes destrutivas, como remover um registro.',
    usageCode: `import { useState } from 'react';
import { Button } from '../ui/button';
import { ConfirmDialog } from '../ui-better-soft/overlay/confirm-dialog';

export function DeleteItemButton() {
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
}`,
  },
  {
    id: 'filter-stat-card',
    groupId: 'ui-better-soft',
    label: 'Filter Stat Card',
    description: 'Cartao clicavel com contagem, usado como filtro rapido acima de uma lista.',
    usageCode: `import { useState } from 'react';
import { FilterStatCard } from '../ui-better-soft/lists/filter-stat-card';

export function AbsenceFilters() {
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
    </div>
  );
}`,
  },
  {
    id: 'entity-list-card',
    groupId: 'ui-better-soft',
    label: 'Entity List Card',
    description: 'Casca de cartao para itens de lista, com area principal e acoes a direita.',
    usageCode: `import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { EntityListCard } from '../ui-better-soft/lists/entity-list-card';

export function AbsenceRow() {
  return (
    <ul className="space-y-3">
      <EntityListCard
        leading={
          <div>
            <span className="text-sm font-semibold">Ferias</span>
            <Badge variant="outline" className="ml-2 text-[11px]">Agendada</Badge>
            <p className="mt-1.5 text-sm text-muted-foreground">10 jan — 20 jan</p>
          </div>
        }
        trailing={
          <div className="flex gap-1">
            <Button variant="ghost" size="sm"><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        }
      />
    </ul>
  );
}`,
  },
  {
    id: 'media-result-card',
    groupId: 'ui-better-soft',
    label: 'Media Result Card',
    description:
      'Casca generica de cartao de resultado de listagem: capa com badges opcionais, titulo, subtitulo, linha opcional (avatar+nome, rating...) e rodape (preco/CTA). Quem chama monta os conteudos dos slots.',
    usageCode: `import { Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import { buttonVariants } from '../ui/button';
import { MediaResultCard } from '../ui-better-soft/lists/media-result-card';

export function ServiceCardExample() {
  return (
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
  );
}`,
  },
  {
    id: 'icon-choice-grid',
    groupId: 'ui-better-soft',
    label: 'Icon Choice Grid',
    description:
      'Grade de cartoes selecionaveis (icone + titulo + descricao), para um passo de escolha de grupo/categoria. accent troca entre o tom brand e primary; layout troca entre icone em cima (vertical) ou ao lado (horizontal).',
    usageCode: `import { Zap } from 'lucide-react';
import { useState } from 'react';
import { IconChoiceGrid } from '../ui-better-soft/lists/icon-choice-grid';

export function GroupPicker() {
  const [value, setValue] = useState<string>();

  return (
    <IconChoiceGrid
      items={[
        { id: '1', icon: <Zap className="h-5 w-5" />, title: 'Eletrica', description: 'Instalacoes e reparos' },
        { id: '2', icon: <Zap className="h-5 w-5" />, title: 'Hidraulica', description: 'Encanamento e vazamentos' },
      ]}
      value={value}
      onChange={setValue}
      accent="brand"
    />
  );
}`,
  },
  {
    id: 'chip-toggle-list',
    groupId: 'ui-better-soft',
    label: 'Chip Toggle List',
    description:
      'Lista de chips (pills) selecionaveis em multipla escolha, para marcar variacoes/tags num passo de wizard.',
    usageCode: `import { useState } from 'react';
import { ChipToggleList } from '../ui-better-soft/lists/chip-toggle-list';

export function SpecialtyPicker() {
  const [value, setValue] = useState<string[]>([]);

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
}`,
  },
  {
    id: 'empty-state-card',
    groupId: 'ui-better-soft',
    label: 'Empty State Card',
    description: 'Bloco de estado vazio com icone, titulo, descricao e acao opcional.',
    usageCode: `import { CalendarOff, Plus } from 'lucide-react';
import { BsButton } from '../ui-better-soft/buttons/bs-button';
import { EmptyStateCard } from '../ui-better-soft/lists/empty-state-card';

export function NoAbsences() {
  return (
    <EmptyStateCard
      icon={CalendarOff}
      title="Nenhuma folga cadastrada"
      description="Cadastre datas em que voce nao vai atender para bloquear novos agendamentos."
      action={<BsButton label="Nova folga" icon={Plus} onClick={() => {}} />}
    />
  );
}`,
  },
  {
    id: 'form-field',
    groupId: 'ui-better-soft',
    label: 'Form Field',
    description:
      'Campo normalizado ligado ao Formik: input, textarea ou switch com label e erro. Substitui os wrapper-field/checkbox/textarea (deprecated).',
    usageCode: `import * as Yup from 'yup';
import { useForm } from '@kizuna/core';
import { FormField } from '../ui-better-soft/forms/form-field';
import { BsButton } from '../ui-better-soft/buttons/bs-button';

type CustomDayOff = { name: string; date: string; recurring: boolean; description: string };

export function CustomDayOffForm() {
  const form = useForm<CustomDayOff>({
    initialValues: { name: '', date: '', recurring: false, description: '' },
    validationSchema: Yup.object({
      name: Yup.string().trim().required('Informe o nome.'),
      date: Yup.string().trim().required('Informe a data.'),
    }),
    onSubmit: async (values) => {
      // persist through the resource hook of the page (useTenantResource.saveOne),
      // not through useForm's resourceSubmit — keeps a single hook talking to resources
    },
  });

  return (
    <div className="space-y-4">
      <FormField formik={form.formik} field="name" label="Nome" placeholder="Ex.: Folga de aniversario" />
      <FormField formik={form.formik} field="date" label="Data" type="date" />
      <FormField formik={form.formik} field="recurring" as="switch" label="Recorrente" description="Repete todo ano nesta data." />
      <FormField formik={form.formik} field="description" as="textarea" label="Observacao" rows={3} />
      <BsButton label="Salvar" onClick={() => void form.formik.submitForm()} />
    </div>
  );
}`,
  },
  {
    id: 'number-field',
    groupId: 'ui-better-soft',
    label: 'Number Field',
    description:
      'Campo numerico com stepper (-/input/+), sufixo e dica opcionais. Para ajustes de preferencias como antecedencia, buffer e raio de atendimento.',
    usageCode: `import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { NumberField } from '../ui-better-soft/forms/number-field';

export function ServiceRadiusField() {
  const [radiusKm, setRadiusKm] = useState(10);

  return (
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
  );
}`,
  },
  {
    id: 'section-illustration',
    groupId: 'ui-better-soft',
    label: 'Section Illustration',
    description:
      'Balao de mensagem + mascote SVG animavel, usado no topo de paginas do painel para dar contexto. Aceita uma cena registrada (sceneKey) ou uma cena inline (scene).',
    usageCode: `import { SectionIllustration } from '../ui-better-soft/section-illustration';

export function MeusServicosHeader() {
  return <SectionIllustration sceneKey="meus-servicos" />;
}

// ou uma cena inline, para paginas ainda nao registradas:
export function CustomSceneHeader() {
  return (
    <SectionIllustration
      scene={{
        message: 'Configure sua agenda de atendimento',
        character: 'old-lady',
        accessories: [{ key: 'calendar', x: -30, y: 6 }],
      }}
    />
  );
}`,
  },
  {
    id: 'entity-grid-list',
    groupId: 'ui-better-soft',
    label: 'Entity Grid List',
    description:
      'Alternancia cards/lista com persistencia em localStorage, estado vazio e acoes no cabecalho. Generico: quem chama define renderCard/renderRow.',
    usageCode: `import { Pencil } from 'lucide-react';
import { EntityGridList } from '../ui-better-soft/lists/entity-grid-list';

type Item = { id: string; title: string };

export function ItemsSection({ items }: { items: Item[] }) {
  return (
    <EntityGridList
      title="Seus itens"
      items={items}
      getKey={(item) => item.id}
      renderCard={(item) => (
        <div className="rounded-2xl border border-border bg-card p-4">{item.title}</div>
      )}
      renderRow={(item) => (
        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
          {item.title}
          <Pencil className="h-4 w-4" />
        </div>
      )}
      emptyState={<p className="text-sm text-muted-foreground">Nenhum item ainda.</p>}
    />
  );
}`,
  },
  {
    id: 'inline-alert',
    groupId: 'ui-better-soft',
    label: 'Inline Alert',
    description:
      'Banner inline pequeno para feedback de erro/sucesso acima de um formulario ou passo de wizard.',
    usageCode: `import { InlineAlert } from '../ui-better-soft/inline-alert';

export function StepErrors({ loadError }: { loadError: string | null }) {
  return loadError ? <InlineAlert type="error" text={loadError} /> : null;
}`,
  },
  {
    id: 'rpc-tester',
    groupId: 'ui-better-soft',
    label: 'RPC Tester',
    description:
      'Ferramenta de debug: executa uma funcao RPC do PostgREST (schema + nome + parametros JSON) contra um endpoint POST e mostra status/payload. Sem regra de negocio, generico por endpoint.',
    usageCode: `import { RpcTester } from '../rpc-tester';

export function FuncoesPage() {
  return <RpcTester endpoint="/api/postgrest/rpc" backHref="/painel" />;
}`,
  },
  {
    id: 'pwa-register',
    groupId: 'ui-better-soft',
    label: 'PWA Register',
    description:
      'Componente sem UI: registra o service worker do app, com uma limpeza de cache/registro rodando uma unica vez (guardada por migrationKey no localStorage). swUrl e migrationKey sao especificos de cada projeto.',
    usageCode: `import { PwaRegister } from '../pwa-register';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <PwaRegister swUrl="/sw.js?v=2" migrationKey="meu-app-sw-migration-v2" />
      </body>
    </html>
  );
}`,
  },
  {
    id: 'location-modal',
    groupId: 'ui-better-soft',
    label: 'Location Modal',
    description:
      'Seletor de localizacao (estado -> cidade) via API do IBGE, com deteccao automatica opcional. LocationTrigger e o botao que parece um select; LocationModal e o dialogo de escolha.',
    usageCode: `import { useState } from 'react';
import { LocationTrigger, LocationModal } from '../location-modal';

export function LocationPicker() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <LocationTrigger onClick={() => setOpen(true)} />
      <LocationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}`,
  },
  {
    id: 'system-config-section',
    groupId: 'ui-better-soft',
    label: 'System Config Section',
    description:
      'Card generico pra editar UM registro de auth.system_config (plugin system_config) — o projeto so declara os campos (toggle/select/textarea), o componente cuida de renderizar e salvar via /api/resources/system_config/<key>.',
    usageCode: `import { SystemConfigSection, type SystemConfigFieldSpec } from '../ui-better-soft/system-config-section';

const FIELDS: SystemConfigFieldSpec[] = [
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
  },
];

export function DocumentFieldConfig() {
  return (
    <SystemConfigSection
      configKey="user_data.document_field"
      title="Campo de documento"
      fields={FIELDS}
      initialValue={{ visible: true, required: false, mask: 'cpf_cnpj' }}
    />
  );
}`,
  },
];

export const DEFAULT_SHOWCASE_SECTION: ShowcaseSectionId = 'cards';

export function isShowcaseSection(value: string): value is ShowcaseSectionId {
  return SHOWCASE_SECTIONS.some((section) => section.id === value);
}

export function normalizeShowcaseSection(value: string): ShowcaseSectionId | null {
  if (isShowcaseSection(value)) return value;
  if (value === 'ui-better-soft') return 'experience-pill';
  if (value === 'stepper') return 'bottom-progress-bar';
  return null;
}

export function getShowcaseSection(id: ShowcaseSectionId) {
  return SHOWCASE_SECTIONS.find((section) => section.id === id) ?? SHOWCASE_SECTIONS[0];
}
