import cfg from '@/../kizuna.config.json';
import type { ChargeReferenceConfig } from './reference';

/**
 * `marketing.payments.referencePrefix` do kizuna.config.json (mesmo padrão de `boost-config.ts`) e
 * `site.name` para a descrição da cobrança. Sem o prefixo, a cobrança sai como sempre. Só servidor.
 */
const project = cfg as {
  site?: { name?: string };
  marketing?: { payments?: { referencePrefix?: string; projectName?: string } };
};

export const projectChargeReference: ChargeReferenceConfig = {
  referencePrefix: project.marketing?.payments?.referencePrefix,
  projectName: project.marketing?.payments?.projectName ?? project.site?.name,
};
