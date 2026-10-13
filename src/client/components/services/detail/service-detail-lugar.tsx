import { MapPin } from 'lucide-react';
import { AdExtraFields } from './ad-extra-fields';
import { AdDescription } from './ad-description';
import { Badge, Section } from './service-detail-cinema';
import type { ServiceDetailVariantComponent } from './service-detail-types';

/**
 * Variant `"lugar"` — o anúncio fala de um LUGAR (shopping, loja, parque, mirante), não de um
 * serviço contratado: nenhuma menção a preço, cobrança, gratuito/pago, atendimento ou urgência.
 * Só a descrição e as respostas do formulário da categoria, com os títulos de seção da config
 * (`serviceDetail.sectionTitles`, ex. "Sobre o lugar").
 */
export const ServiceDetailLugar: ServiceDetailVariantComponent = ({
  service,
  extraFields,
  hue,
  labels,
}) => (
  <>
    {service.description && (
      <Section title={labels.about} hue={hue}>
        <AdDescription text={service.description} />
      </Section>
    )}

    {extraFields && (
      <Section title={labels.details} hue={hue}>
        <AdExtraFields schema={extraFields.schema} answers={extraFields.answers} />
      </Section>
    )}
  </>
);

/** Sidebar da variant `"lugar"`: no lugar da caixa de preço, o nome do lugar e o que ele é. */
export const ServiceDetailLugarSidebar: ServiceDetailVariantComponent = ({
  service,
  subcategoryNames,
}) => (
  <>
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
      <MapPin className="h-3.5 w-3.5 text-brand" /> {service.category?.name ?? 'Lugar'}
    </div>
    <div className="mt-2 font-display text-2xl font-black leading-snug">{service.title}</div>
    {subcategoryNames.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {subcategoryNames.map((name) => (
          <Badge key={name}>{name}</Badge>
        ))}
      </div>
    )}
  </>
);
