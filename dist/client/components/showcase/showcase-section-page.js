'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import Link from 'next/link';
import { Bell, CalendarOff, Check, Copy, MapPin, Palmtree, Pencil, Plus, Save, Sparkles, Trash2, Utensils, } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button, buttonVariants } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ExperiencePill } from '../ui-better-soft/experience-pill';
import { WizardLayoutToggle } from '../wizard/wizard-layout-toggle';
import { FixedBottomProgress } from '../ui-better-soft/fixed-bottom-progress';
import { MosaicGrid } from '../ui-better-soft/mosaic-grid';
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
import { SystemConfigSection, } from '../ui-better-soft/system-config-section';
import { RpcTester } from '../rpc-tester';
import { LocationTrigger, LocationModal } from '../location-modal';
import { FormBuilderShowcaseDemo } from '../form-builder/showcase-demo';
import { FormsShowcaseDemo } from '../forms/showcase-demo';
import { PagesAdminShowcaseDemo } from '../pages/showcase-demo';
import { useForm } from '@kizuna/core';
import * as Yup from 'yup';
import { getShowcaseSection } from './showcase-sections';
function CodeUsage({ code }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        }
        catch {
            setCopied(false);
        }
    };
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between gap-3 space-y-0", children: [_jsxs("div", { children: [_jsx(CardTitle, { className: "text-base", children: "Codigo de uso" }), _jsx(CardDescription, { children: "Copie e cole para reutilizar o componente." })] }), _jsxs(Button, { onClick: handleCopy, size: "sm", type: "button", variant: "outline", children: [copied ? _jsx(Check, { className: "mr-1 h-4 w-4" }) : _jsx(Copy, { className: "mr-1 h-4 w-4" }), copied ? 'Copiado' : 'Copiar'] })] }), _jsx(CardContent, { children: _jsx("pre", { className: "overflow-x-auto rounded-lg border border-border bg-background p-3 text-xs leading-5 text-foreground sm:text-sm", children: _jsx("code", { children: code }) }) })] }));
}
function CardsDemo() {
    return (_jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsxs("div", { className: "rounded-xl border border-border bg-background p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.12em] text-muted-foreground", children: "Assinaturas" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-foreground", children: "428" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "+16% em 30 dias" })] }), _jsxs("div", { className: "rounded-xl border border-border bg-background p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.12em] text-muted-foreground", children: "Atendimentos" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-foreground", children: "1.204" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Tempo medio: 3m 20s" })] }), _jsxs("div", { className: "rounded-xl border border-border bg-background p-4", children: [_jsx("p", { className: "text-xs uppercase tracking-[0.12em] text-muted-foreground", children: "Conversao" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-foreground", children: "8.7%" }), _jsx("p", { className: "mt-1 text-sm text-muted-foreground", children: "Melhor semana do trimestre" })] })] }));
}
function ButtonsDemo() {
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx(Button, { children: "Primario" }), _jsx(Button, { variant: "outline", children: "Outline" }), _jsx(Button, { variant: "ghost", children: "Ghost" }), _jsx(Button, { size: "sm", children: "Pequeno" }), _jsx(Button, { size: "lg", children: "Grande" }), _jsx(Button, { disabled: true, children: "Desabilitado" })] }));
}
function FormsDemo() {
    return (_jsxs("form", { className: "grid gap-3 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-foreground", htmlFor: "nome-showcase", children: "Nome" }), _jsx(Input, { id: "nome-showcase", placeholder: "Digite o nome" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-sm font-medium text-foreground", htmlFor: "email-showcase", children: "Email" }), _jsx(Input, { id: "email-showcase", placeholder: "nome@empresa.com", type: "email" })] }), _jsxs("div", { className: "space-y-2 md:col-span-2", children: [_jsx("label", { className: "text-sm font-medium text-foreground", htmlFor: "assunto-showcase", children: "Assunto" }), _jsx(Input, { id: "assunto-showcase", placeholder: "Tema da solicitacao" })] }), _jsx("div", { className: "md:col-span-2", children: _jsx(Button, { type: "button", children: "Salvar alteracoes" }) })] }));
}
function TablesDemo() {
    return (_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Tarefa" }), _jsx(TableHead, { children: "Status" }), _jsx(TableHead, { children: "Responsavel" }), _jsx(TableHead, { children: "Prazo" })] }) }), _jsxs(TableBody, { children: [_jsxs(TableRow, { children: [_jsx(TableCell, { children: "Revisar onboarding" }), _jsx(TableCell, { children: "Em andamento" }), _jsx(TableCell, { children: "Beatriz" }), _jsx(TableCell, { children: "22/05" })] }), _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Atualizar banner" }), _jsx(TableCell, { children: "Concluido" }), _jsx(TableCell, { children: "Rafael" }), _jsx(TableCell, { children: "20/05" })] }), _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Melhorar filtros" }), _jsx(TableCell, { children: "Bloqueado" }), _jsx(TableCell, { children: "Camila" }), _jsx(TableCell, { children: "24/05" })] })] })] }));
}
function AlertsDemo() {
    return (_jsxs("div", { className: "space-y-3", children: [_jsx("div", { className: "rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300", children: "Operacao concluida com sucesso." }), _jsx("div", { className: "rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300", children: "Revisao recomendada antes de publicar." }), _jsx("div", { className: "rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300", children: "Falha ao sincronizar dados. Tente novamente." })] }));
}
function ProgressDemo() {
    const [value, setValue] = useState(52);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(Progress, { value: value, className: "h-2.5" }), _jsx("div", { className: "flex flex-wrap gap-2", children: [15, 40, 65, 90].map((item) => (_jsxs(Button, { type: "button", variant: "outline", size: "sm", onClick: () => setValue(item), children: [item, "%"] }, item))) })] }));
}
function UiBetterSoftDemo() {
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx(ExperiencePill, {}), _jsx(ExperiencePill, { text: "Publicacao em menos de 2 minutos" })] }));
}
function WizardLayoutToggleDemo() {
    const [layout, setLayout] = useState('scroll');
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx(WizardLayoutToggle, { value: layout, onChange: setLayout }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Layout selecionado: ", _jsx("span", { className: "font-medium text-foreground", children: layout })] })] }));
}
const MOSAIC_DEMO_ITEMS = [
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
function MosaicGridDemo() {
    return _jsx(MosaicGrid, { items: MOSAIC_DEMO_ITEMS });
}
function BottomProgressBarDemo() {
    const [currentStep, setCurrentStep] = useState(2);
    const steps = [
        { id: 1, label: 'Categoria' },
        { id: 2, label: 'Detalhes' },
        { id: 3, label: 'Imagens' },
        { id: 4, label: 'Revisao' },
    ];
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(FixedBottomProgress, { fixed: false, steps: steps, value: currentStep }), _jsx("div", { className: "flex flex-wrap gap-2", children: steps.map((step) => (_jsx(Button, { type: "button", size: "sm", variant: currentStep === step.id ? 'default' : 'outline', onClick: () => setCurrentStep(step.id), children: step.label }, step.id))) }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Etapa atual: ", _jsx("span", { className: "font-medium text-foreground", children: currentStep })] })] }));
}
function AdminPageReaderDemo() {
    return (_jsx(AdminPageReader, { title: "Preferencias", description: "Diga como voce quer receber pedidos e quando esta disponivel para atender.", backHref: "/showcase/admin-page-reader", backLabel: "Ir ao painel", actions: _jsxs(_Fragment, { children: [_jsx(BsButton, { variant: "outline", label: "Restaurar padrao" }), _jsx(BsButton, { variant: "default", label: "Salvar", icon: Save })] }), className: "mb-0 rounded-xl border border-border bg-background p-4" }));
}
function PageHeaderDemo() {
    return (_jsx(PageHeader, { eyebrow: "Meus servi\u00E7os", title: "Gerenciar servi\u00E7os", description: "Crie servi\u00E7os em etapas e continue a edi\u00E7\u00E3o quando precisar.", actions: _jsxs(_Fragment, { children: [_jsx(Link, { href: "/painel", className: buttonVariants({ variant: 'outline' }), children: "Voltar ao painel" }), _jsxs(Link, { href: "/painel/meus-servicos/novo", className: buttonVariants(), children: [_jsx(Plus, { className: "h-4 w-4" }), "Novo servi\u00E7o"] })] }) }));
}
function BsButtonDemo() {
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-3", children: [_jsx(BsButton, { variant: "outline", label: "Restaurar padrao" }), _jsx(BsButton, { variant: "default", label: "Salvar", icon: Save })] }));
}
function ToggleRowDemo() {
    const [newDemands, setNewDemands] = useState(true);
    const [marketing, setMarketing] = useState(false);
    return (_jsxs("div", { className: "space-y-3", children: [_jsx(ToggleRow, { title: "Novas demandas de clientes", subtitle: "Avisar quando aparecer uma demanda que combina com seus servicos.", checked: newDemands, onChange: setNewDemands }), _jsx(ToggleRow, { title: "Novidades e dicas", subtitle: "Recadinhos ocasionais sobre a plataforma.", checked: marketing, onChange: setMarketing })] }));
}
function ChannelChipDemo() {
    const [email, setEmail] = useState(true);
    const [push, setPush] = useState(true);
    const [whatsapp, setWhatsapp] = useState(false);
    return (_jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx(ChannelChip, { label: "E-mail", checked: email, onChange: setEmail }), _jsx(ChannelChip, { label: "Push no app", checked: push, onChange: setPush }), _jsx(ChannelChip, { label: "WhatsApp", checked: whatsapp, onChange: setWhatsapp })] }));
}
function ScheduleRowDemo() {
    const [monday, setMonday] = useState({ enabled: true, start: '08:00', end: '18:00' });
    const [lunch, setLunch] = useState({ enabled: true, start: '12:00', end: '13:00' });
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(ScheduleRow, { label: "Segunda", enabled: monday.enabled, onEnabledChange: (enabled) => setMonday((current) => ({ ...current, enabled })), start: monday.start, end: monday.end, onStartChange: (start) => setMonday((current) => ({ ...current, start })), onEndChange: (end) => setMonday((current) => ({ ...current, end })) }), _jsx(ScheduleRow, { label: "Almoco", icon: Utensils, description: "Horario de pausa aplicado em todos os dias de atendimento.", enabled: lunch.enabled, onEnabledChange: (enabled) => setLunch((current) => ({ ...current, enabled })), start: lunch.start, end: lunch.end, onStartChange: (start) => setLunch((current) => ({ ...current, start })), onEndChange: (end) => setLunch((current) => ({ ...current, end })) })] }));
}
function SettingsSectionDemo() {
    return (_jsx(Section, { icon: _jsx(Bell, { className: "h-4 w-4" }), title: "Notificacoes", description: "Escolha o que voce quer receber e por onde.", children: _jsx("p", { className: "text-sm text-muted-foreground", children: "Conteudo da secao vai aqui." }) }));
}
function ChoiceCardDemo() {
    const [clientPicks, setClientPicks] = useState(true);
    return (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsx(ChoiceCard, { selected: clientPicks, onSelect: () => setClientPicks(true), title: "O cliente escolhe", description: "O cliente ve os horarios livres e ja escolhe dia e hora.", badge: "Mais rapido" }), _jsx(ChoiceCard, { selected: !clientPicks, onSelect: () => setClientPicks(false), title: "Eu escolho ao fechar", description: "Voce combina o horario ao confirmar o pedido.", badge: "Mais controle" })] }));
}
function ModalPanelDemo() {
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx(BsButton, { label: "Nova folga", onClick: () => setOpen(true) }), _jsx(ModalPanel, { open: open, onClose: () => setOpen(false), icon: _jsx(Palmtree, { className: "h-4 w-4 text-brand" }), title: "Nova folga", description: "Bloqueie a data para nao receber novos agendamentos.", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", onClick: () => setOpen(false), children: "Cancelar" }), _jsx(BsButton, { label: "Salvar", onClick: () => setOpen(false) })] }), children: _jsx("p", { className: "text-sm text-muted-foreground", children: "Conteudo do formulario aqui." }) })] }));
}
function ConfirmDialogDemo() {
    const [open, setOpen] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "ghost", className: "text-destructive", onClick: () => setOpen(true), children: "Remover" }), _jsx(ConfirmDialog, { open: open, title: "Remover folga?", description: "Essa acao nao pode ser desfeita.", confirmLabel: "Remover", onConfirm: () => setOpen(false), onCancel: () => setOpen(false) })] }));
}
function FilterStatCardDemo() {
    const [filter, setFilter] = useState('todas');
    return (_jsxs("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-4", children: [_jsx(FilterStatCard, { label: "Em andamento", value: 3, tone: "success", active: filter === 'ativas', onClick: () => setFilter(filter === 'ativas' ? 'todas' : 'ativas') }), _jsx(FilterStatCard, { label: "Agendadas", value: 2, tone: "info", active: false, onClick: () => { } }), _jsx(FilterStatCard, { label: "Desativadas", value: 1, tone: "muted", active: false, onClick: () => { } }), _jsx(FilterStatCard, { label: "Encerradas", value: 5, tone: "muted", active: false, onClick: () => { } })] }));
}
function EntityListCardDemo() {
    return (_jsx("ul", { className: "space-y-3", children: _jsx(EntityListCard, { leading: _jsxs("div", { children: [_jsx("span", { className: "text-sm font-semibold", children: "Ferias" }), _jsx(Badge, { variant: "outline", className: "ml-2 text-[11px]", children: "Agendada" }), _jsx("p", { className: "mt-1.5 text-sm text-muted-foreground", children: "10 jan \u2014 20 jan" })] }), trailing: _jsxs("div", { className: "flex gap-1", children: [_jsx(Button, { variant: "ghost", size: "sm", children: _jsx(Pencil, { className: "h-3.5 w-3.5" }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-destructive", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) }) }));
}
function MediaResultCardDemo() {
    return (_jsx("div", { className: "max-w-xs", children: _jsx(MediaResultCard, { image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80", imageAlt: "Instalacao eletrica residencial", badgeTopLeft: _jsxs(Badge, { className: "gap-1 bg-amber-500 text-white hover:bg-amber-500", children: [_jsx(Sparkles, { className: "h-3 w-3" }), " Patrocinado"] }), badgeTopRight: _jsx(Badge, { variant: "secondary", className: "bg-background/90 text-foreground shadow", children: "Eletricista" }), title: "Instalacao eletrica residencial", subtitle: "Reparos e instalacoes", leading: _jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-border bg-background/50 px-2 py-1.5", children: [_jsx("span", { className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground", children: "JS" }), _jsx("span", { className: "flex-1 truncate text-[11px] font-semibold text-foreground", children: "@joao_silva" })] }), footer: _jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "text-[11px] uppercase tracking-wide text-muted-foreground", children: "a partir de" }), _jsx("div", { className: "text-lg font-black leading-none", children: "R$ 120,00" })] }), _jsx("a", { href: "#", className: buttonVariants({
                            size: 'sm',
                            className: 'shrink-0 gap-2 text-xs',
                        }), children: "Ver servico" })] }) }) }));
}
function IconChoiceGridDemo() {
    const [value, setValue] = useState('1');
    return (_jsx(IconChoiceGrid, { items: [
            {
                id: '1',
                icon: _jsx(Sparkles, { className: "h-5 w-5" }),
                title: 'Eletrica',
                description: 'Instalacoes e reparos residenciais',
            },
            {
                id: '2',
                icon: _jsx(Sparkles, { className: "h-5 w-5" }),
                title: 'Hidraulica',
                description: 'Encanamento e vazamentos',
            },
            {
                id: '3',
                icon: _jsx(Sparkles, { className: "h-5 w-5" }),
                title: 'Pintura',
                description: 'Residencial e comercial',
            },
        ], value: value, onChange: setValue, accent: "brand" }));
}
function ChipToggleListDemo() {
    const [value, setValue] = useState(['1']);
    return (_jsx(ChipToggleList, { options: [
            { id: '1', label: 'Residencial' },
            { id: '2', label: 'Comercial' },
            { id: '3', label: 'Emergencia 24h' },
        ], value: value, onChange: setValue, accent: "brand" }));
}
function EmptyStateCardDemo() {
    return (_jsx(EmptyStateCard, { icon: CalendarOff, title: "Nenhuma folga cadastrada", description: "Cadastre datas em que voce nao vai atender para bloquear novos agendamentos.", action: _jsx(BsButton, { label: "Nova folga", icon: Plus, onClick: () => { } }) }));
}
function FormFieldDemo() {
    const form = useForm({
        initialValues: { name: '', date: '', recurring: false, description: '' },
        validationSchema: Yup.object({
            name: Yup.string().trim().required('Informe o nome.'),
            date: Yup.string().trim().required('Informe a data.'),
        }),
        onSubmit: async () => {
            // demo only — a real page would call resource.saveOne(values) here
        },
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(FormField, { formik: form.formik, field: "name", label: "Nome", placeholder: "Ex.: Folga de aniversario" }), _jsx(FormField, { formik: form.formik, field: "date", label: "Data", type: "date" }), _jsx(FormField, { formik: form.formik, field: "recurring", as: "switch", label: "Recorrente", description: "Repete todo ano nesta data." }), _jsx(FormField, { formik: form.formik, field: "description", as: "textarea", label: "Observacao", rows: 3 }), _jsx(BsButton, { label: "Validar", onClick: () => void form.formik.submitForm() })] }));
}
function NumberFieldDemo() {
    const [radiusKm, setRadiusKm] = useState(10);
    return (_jsx("div", { className: "max-w-xs", children: _jsx(NumberField, { label: "Raio de atendimento", icon: MapPin, suffix: "km", hint: "Distancia maxima que voce aceita se deslocar.", value: radiusKm, min: 1, max: 200, onChange: setRadiusKm }) }));
}
function SectionIllustrationDemo() {
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(SectionIllustration, { sceneKey: "meus-servicos" }), _jsx(SectionIllustration, { scene: {
                    message: 'Configure sua agenda de atendimento',
                    character: 'old-lady',
                    accessories: [{ key: 'calendar', x: -30, y: 6 }],
                } })] }));
}
const ENTITY_GRID_DEMO_ITEMS = [
    { id: '1', title: 'Pintura residencial', subtitle: 'A partir de R$ 250' },
    { id: '2', title: 'Instalacao eletrica', subtitle: 'A partir de R$ 180' },
];
function EntityGridListDemo() {
    return (_jsx(EntityGridList, { title: "Seus itens", items: ENTITY_GRID_DEMO_ITEMS, getKey: (item) => item.id, storageKey: "showcase-entity-grid-demo", renderCard: (item) => (_jsxs("div", { className: "rounded-2xl border border-border bg-card p-4", children: [_jsx("p", { className: "text-sm font-semibold text-foreground", children: item.title }), _jsx("p", { className: "text-xs text-muted-foreground", children: item.subtitle })] })), renderRow: (item) => (_jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-border bg-card p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-foreground", children: item.title }), _jsx("p", { className: "text-xs text-muted-foreground", children: item.subtitle })] }), _jsx(Pencil, { className: "h-4 w-4 text-muted-foreground" })] })), emptyState: _jsx("p", { className: "text-sm text-muted-foreground", children: "Nenhum item ainda." }) }));
}
function InlineAlertDemo() {
    return (_jsxs("div", { className: "space-y-3", children: [_jsx(InlineAlert, { type: "error", text: "N\u00E3o foi poss\u00EDvel carregar os dados. Tente novamente." }), _jsx(InlineAlert, { type: "success", text: "Altera\u00E7\u00F5es salvas com sucesso." })] }));
}
function RpcTesterDemo() {
    return (_jsx("div", { className: "overflow-hidden rounded-xl border border-border", children: _jsx(RpcTester, { eyebrow: "Showcase", title: "Teste de funcoes RPC" }) }));
}
function PwaRegisterDemo() {
    // Sem preview ao vivo de proposito: montar <PwaRegister /> registraria um service worker
    // de verdade nesta pagina do showcase, que nao e o app que o consome.
    return (_jsxs("p", { className: "text-sm text-muted-foreground", children: ["Componente sem UI (retorna ", _jsx("code", { className: "text-foreground", children: "null" }), ") \u2014 nao tem preview visual. Veja o codigo de uso abaixo."] }));
}
function LocationModalDemo() {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(LocationTrigger, { onClick: () => setOpen(true) }), _jsx(LocationModal, { open: open, onClose: () => setOpen(false) })] }));
}
const SYSTEM_CONFIG_DEMO_FIELDS = [
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
    return (_jsx(SystemConfigSection, { configKey: "showcase.demo_field", title: "Campo de documento", description: "Demo \u2014 este card n\u00E3o salva de verdade nesta p\u00E1gina.", fields: SYSTEM_CONFIG_DEMO_FIELDS, initialValue: { visible: true, required: false, mask: 'cpf_cnpj' } }));
}
function SectionDemo({ sectionId }) {
    if (sectionId === 'cards')
        return _jsx(CardsDemo, {});
    if (sectionId === 'buttons')
        return _jsx(ButtonsDemo, {});
    if (sectionId === 'forms')
        return _jsx(FormsDemo, {});
    if (sectionId === 'tables')
        return _jsx(TablesDemo, {});
    if (sectionId === 'alerts')
        return _jsx(AlertsDemo, {});
    if (sectionId === 'progress')
        return _jsx(ProgressDemo, {});
    if (sectionId === 'bottom-progress-bar')
        return _jsx(BottomProgressBarDemo, {});
    if (sectionId === 'mosaic-grid')
        return _jsx(MosaicGridDemo, {});
    if (sectionId === 'admin-page-reader')
        return _jsx(AdminPageReaderDemo, {});
    if (sectionId === 'page-header')
        return _jsx(PageHeaderDemo, {});
    if (sectionId === 'bs-button')
        return _jsx(BsButtonDemo, {});
    if (sectionId === 'toggle-row')
        return _jsx(ToggleRowDemo, {});
    if (sectionId === 'channel-chip')
        return _jsx(ChannelChipDemo, {});
    if (sectionId === 'schedule-row')
        return _jsx(ScheduleRowDemo, {});
    if (sectionId === 'settings-section')
        return _jsx(SettingsSectionDemo, {});
    if (sectionId === 'choice-card')
        return _jsx(ChoiceCardDemo, {});
    if (sectionId === 'modal-panel')
        return _jsx(ModalPanelDemo, {});
    if (sectionId === 'confirm-dialog')
        return _jsx(ConfirmDialogDemo, {});
    if (sectionId === 'filter-stat-card')
        return _jsx(FilterStatCardDemo, {});
    if (sectionId === 'entity-list-card')
        return _jsx(EntityListCardDemo, {});
    if (sectionId === 'media-result-card')
        return _jsx(MediaResultCardDemo, {});
    if (sectionId === 'icon-choice-grid')
        return _jsx(IconChoiceGridDemo, {});
    if (sectionId === 'chip-toggle-list')
        return _jsx(ChipToggleListDemo, {});
    if (sectionId === 'empty-state-card')
        return _jsx(EmptyStateCardDemo, {});
    if (sectionId === 'form-field')
        return _jsx(FormFieldDemo, {});
    if (sectionId === 'number-field')
        return _jsx(NumberFieldDemo, {});
    if (sectionId === 'section-illustration')
        return _jsx(SectionIllustrationDemo, {});
    if (sectionId === 'entity-grid-list')
        return _jsx(EntityGridListDemo, {});
    if (sectionId === 'inline-alert')
        return _jsx(InlineAlertDemo, {});
    if (sectionId === 'rpc-tester')
        return _jsx(RpcTesterDemo, {});
    if (sectionId === 'pwa-register')
        return _jsx(PwaRegisterDemo, {});
    if (sectionId === 'location-modal')
        return _jsx(LocationModalDemo, {});
    if (sectionId === 'system-config-section')
        return _jsx(SystemConfigSectionDemo, {});
    if (sectionId === 'form-builder')
        return _jsx(FormBuilderShowcaseDemo, {});
    if (sectionId === 'forms-manager')
        return _jsx(FormsShowcaseDemo, {});
    if (sectionId === 'pages-admin')
        return _jsx(PagesAdminShowcaseDemo, {});
    if (sectionId === 'wizard-layout-toggle')
        return _jsx(WizardLayoutToggleDemo, {});
    return _jsx(UiBetterSoftDemo, {});
}
export function ShowcaseSectionPage({ sectionId }) {
    const section = getShowcaseSection(sectionId);
    return (_jsxs(_Fragment, { children: [_jsx(Card, { className: "border-primary/20 bg-card/90", children: _jsxs(CardHeader, { children: [_jsx(CardTitle, { children: section.label }), _jsx(CardDescription, { children: section.description })] }) }), _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-base", children: "Preview" }), _jsx(CardDescription, { children: "Visualizacao real do componente em uso." })] }), _jsx(CardContent, { children: _jsx(SectionDemo, { sectionId: sectionId }) })] }), _jsx(CodeUsage, { code: section.usageCode })] }));
}
//# sourceMappingURL=showcase-section-page.js.map