import { registerNamedFormatter } from '../list-block-formatters';
import { formatServicePrice } from './service-helpers';

// Registra o formatter 'servicePrice' usado pelas telas de serviço (o list-block não traz
// formatters específicos de domínio). Importado por efeito colateral pelas telas do plugin.
registerNamedFormatter('servicePrice', (value, item) =>
  formatServicePrice(Number(value) || 0, String(item.priceUnit ?? 'quote'))
);
