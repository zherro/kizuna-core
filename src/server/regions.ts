import cfg from '@/../kizuna.config.json';
import { parseRegions, withRegionCities } from '../shared/regions';

/**
 * `regions` do kizuna.config.json do projeto consumidor, lidas pelo próprio core (mesmo alias `@/`
 * que `postgrest-crud` usa pro `resources.ts`) — o projeto só declara as cidades irmãs no config,
 * sem código de ligação. Só servidor.
 */
export const projectRegions = parseRegions((cfg as { regions?: unknown }).regions);

/** Body da `fn_search_services` com as cidades irmãs de `p_city_ibge` em `p_city_ibges`. */
export const withProjectRegionCities = withRegionCities(projectRegions);
