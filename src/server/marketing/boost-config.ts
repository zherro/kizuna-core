import cfg from '@/../kizuna.config.json';
import { parseBoostPlacementConfig } from '../../shared/marketing/boost-placement';

/**
 * `marketing.boost` do kizuna.config.json do projeto (mesmo padrão de `regions.ts`): vagas patrocinadas
 * do impulsionamento. Sem a chave valem os padrões de `DEFAULT_BOOST_PLACEMENT`; projeto sem o plugin
 * marketing não é afetado (o banco só lê `vw_boosts_live` se a view existir). Só servidor.
 */
export const projectBoostPlacement = parseBoostPlacementConfig(
  (cfg as { marketing?: { boost?: unknown } }).marketing?.boost,
);
