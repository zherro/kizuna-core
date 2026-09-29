import type { ReactNode } from 'react';
import { MapPin, Receipt, Wallet, Zap } from 'lucide-react';
import { hueGradient } from './category-style';
import { AdExtraFields } from './ad-extra-fields';
import type { ServiceDetailVariantComponent } from './service-detail-types';
import {
  PRICE_UNIT_LABEL,
  SERVICE_LOCATION_LABEL,
} from '../service-labels';
import { formatServicePrice } from '../service-helpers';

/** Uma célula da faixa de facts, abaixo do título. */
function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-4">
      <div className="flex items-center gap-1.5 text-brand">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-1.5 text-sm font-bold leading-snug">{value}</div>
    </div>
  );
}

/** Um bloco de leitura ("Sobre o serviço", "Detalhes do serviço") — sem card, um marcador na cor
 * da categoria à esquerda do título. */
function Section({ title, hue, children }: { title: string; hue: number; children: ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="flex items-center gap-3 font-display text-xl font-black tracking-tight">
        <span className="h-5 w-1 shrink-0 rounded-full" style={{ backgroundImage: hueGradient(hue) }} />
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Variant `"service"` — o layout default (e fallback de toda categoria sem variant configurada):
 * faixa de facts (preço/cobrança/atendimento/urgência), descrição em HTML e as respostas do
 * formulário dinâmico da categoria, se houver.
 */
export const ServiceDetailDefault: ServiceDetailVariantComponent = ({
  service,
  extraFields,
  hue,
}) => {
  const priceLabel =
    service.priceUnit === 'quote' || !service.startingPrice
      ? 'Sob consulta'
      : formatServicePrice(service.startingPrice, service.priceUnit).split(' · ')[0];
  const billingLabel =
    service.priceUnit === 'quote' || !service.startingPrice
      ? 'Sob consulta'
      : (PRICE_UNIT_LABEL[service.priceUnit] ?? service.priceUnit);
  const locationLabel = service.serviceLocation
    ? (SERVICE_LOCATION_LABEL[service.serviceLocation] ?? service.serviceLocation)
    : null;

  return (
    <>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={<Wallet className="h-4 w-4" />} label="Preço" value={priceLabel} />
        <Fact icon={<Receipt className="h-4 w-4" />} label="Cobrança" value={billingLabel} />
        <Fact
          icon={<MapPin className="h-4 w-4" />}
          label="Atendimento"
          value={locationLabel ?? 'A combinar'}
        />
        <Fact
          icon={<Zap className="h-4 w-4" />}
          label="Urgência"
          value={service.urgentAvailable ? 'Atende urgência' : 'Agendamento normal'}
        />
      </div>

      {service.description && (
        <Section title="Sobre o serviço" hue={hue}>
          <div
            className="text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_li]:ml-4 [&_ol]:mb-2 [&_ol]:list-decimal [&_p]:mb-2 [&_strong]:font-semibold [&_ul]:mb-2 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: service.description }}
          />
        </Section>
      )}

      {extraFields && (
        <Section title="Detalhes do serviço" hue={hue}>
          <AdExtraFields schema={extraFields.schema} answers={extraFields.answers} />
        </Section>
      )}
    </>
  );
};
